import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { useReactToPrint } from "react-to-print";
import { signal, effect, useSignal } from "@preact/signals-react";
/* @NOTE: `navigator.clipboard` is undefined in Safari 12.1.x as well as the earlier versions 
  of other browsers like Chrome (Webkit), Firefox, Edge (EdgeHTML) */
/* @CHECK: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard#clipboard_availability */
import "clipboard-polyfill/overwrite-globals"; /* @_SHIM: # */

/* @HINT: 

  ADAPTER PATTERN is used here to convert the signals API:
  
  - effect()
  - signal()

  which is imported above to the React state (format) API:

  - useSignalsState() => useState()
  - useSignalsEffect() => useEffect()

*/

/* @HINT: 

  STRATEGY PATTERN is used to now choose between using the

  - useAppState() => useSignalsState() OR useState()
  - useAppEffect() => useSignalsState() OR useEffect()

*/

/* @HINT: 

  COMMAND PATTERN is used to execute certain app data tasks

  - print()
  - copy()
  - paste()

*/

/**
 * @SEE: https://github.com/preactjs/signals/issues/307
 */
function useSignal$(value) {
  const $signal = useRef();
  return ($signal.current ??= signal(value));
}

const useSignalsState = (initialState) => {
  /* @HINT: ADAPTER PATTERN */

  const useSignal_ = Boolean(useSignal) ? useSignal : useSignal$;
  const signal = useSignal_(
    typeof initialState === "function" ? initialState() : initialState
  );
  return [
    signal,
    (dataOrFunction) => {
      if (typeof dataOrFunction === "function") {
        signal.value = dataOrFunction(signal.peek());
        return;
      }
      signal.value = dataOrFunction;
    }
  ];
};

const useSignalsEffect = (callback = () => undefined, depenencyList = []) => {
  /* @HINT: ADAPTER PATTERN */

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const $callback = useCallback(callback, depenencyList);

  useEffect(() => {
    return effect($callback);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);
};

export const useAppState = (appState, useSignals = false) => {
  /* @HINT: STRATEGY PATTERN */

  const statePrimitiveMap = {
    signals: useSignalsState,
    container: useState
  };

  return statePrimitiveMap[useSignals ? "signals" : "container"](appState);
};

export const useAppEffect = (effectCallback, useSignals = false) => {
  /* @HINT: STRATEGY PATTERN */

  const statePrimitiveMap = {
    signals: useSignalsEffect,
    container: useEffect
  };

  return statePrimitiveMap[useSignals ? "signals" : "container"](
    effectCallback
  );
};

function printPageFactory() {
  return (componentRef = null) => {
    let promise = null;
    if (componentRef === null) {
      promise = new Promise((resolve, reject) => {
        setTimeout(() => {
          if (typeof window.print === "function") {
            return resolve(undefined);
          }
          reject(new Error("Cannot print page"));
        }, 50);
      });
      /* @HINT: Programmatically printing text in the browser */
      try {
        /* @NOTE: `window.print()` is unsupported in Android v7.x+ | supported however in Android v5.x- */
        /* @CHECK: https://github.com/gregnb/react-to-print/issues/187 */

        /* @NOTE: Opera Mini all versions & Android Browser v2.1.x to v4.3.x also doesn't support `window.print()` */
        window.print();
      } catch (_) {}
      return promise;
    }
    return Promise.reject(new Error("Cannot print"));
  };
}

function pasteTextFactory() {
  return () => {
    /* @NOTE: Firefox v63.x+ does not support `Clipboard.prototype.readdText()` */
    try {
      navigator.clipboard.readText().then((clipText) => {
        /* @HINT: Programmatically pasting text in the browser */
        if (document.queryCommandEnabled("insertText")) {
          const activeElement = document.activeElement;
          const selection = document.getSelection();

          if (
            activeElement.contentEditable === "true" ||
            activeElement.contentEditable === "inherit"
          ) {
            if (selection === null || selection !== null) {
              const caretPosition =
                typeof activeElement.selectionStart === "number"
                  ? activeElement.selectionStart
                  : -1;
              if (caretPosition !== -1) {
                try {
                  if (document.execCommand("insertText", false, clipText)) {
                    return "";
                  }
                } catch (_) {}
              }
            }
          }
        }
        return clipText;
      });
    } catch (error) {
      if (document.hasFocus()) {
        const activeElement = document.activeElement;
        if (activeElement !== null) {
          if (
            activeElement.contentEditable === "true" ||
            activeElement.contentEditable === "inherit" ||
            activeElement.nodeName !== "#document"
          ) {
            const selection = document.getSelection();

            if (selection === null || selection.toString().length === 0) {
              const caretPosition =
                typeof activeElement.selectionStart === "number"
                  ? activeElement.selectionStart
                  : -1;
              if (document.queryCommandEnabled("paste")) {
                try {
                  if (document.execCommand("paste", false, window.name)) {
                    return Promise.resolve(window.name);
                  }
                } catch (_) {}
              } else if (document.queryCommandEnabled("insertText")) {
                if (caretPosition !== -1) {
                  try {
                    if (
                      document.execCommand("insertText", false, window.name)
                    ) {
                      return Promise.resolve(window.name);
                    }
                  } catch (_) {}
                }
              }
            }
          }
        }
      }

      Promise.reject(error);
    }
  };
}

function copyTextFactory() {
  return (text = "") => {
    /* @NOTE: `navigator.clipboard.writeText(...)` throws vague error in Safari v13.1.x+ even when called in a real user context */
    /* @CHECK: https://developer.apple.com/forums/thread/691873 */
    try {
      /* @HINT: Programmatically copying text in the browser */
      return navigator.clipboard.writeText(text);
    } catch (error) {
      if (document.hasFocus()) {
        /* @HINT: Programmatically copying text in the browser */
        const activeElement = document.activeElement;
        if (activeElement !== null) {
          if (
            activeElement.contentEditable === "true" ||
            activeElement.contentEditable === "inherit" ||
            activeElement.nodeName !== "#document"
          ) {
            const selection = document.getSelection();
            let copied = false;

            if (selection !== null) {
              const selectedText = selection.toString();
              if (document.queryCommandEnabled("copy")) {
                try {
                  if (
                    document.execCommand(
                      "copy",
                      false,
                      selectedText.length > 0 ? selectedText : text
                    )
                  ) {
                    copied = true;
                  }
                } catch (_) {
                  /* @HINT: Can't use the native browser clipboard, so use the next best thing: the `name` property of the window */

                  window.name = selectedText.length > 0 ? selectedText : text;
                  copied = true;
                }
              }
              return Promise.resolve(undefined);
            }
          }
        }
      }
      return Promise.reject(error);
    }
  };
}

export const useCommands = () => {
  /* @HINT: COMMAND PATTERN */

  const commands = useRef({
    copy: copyTextFactory(),
    paste: pasteTextFactory(),
    print: printPageFactory()
  }).current;

  return useMemo(
    () => ({
      hub: {
        execute(commandName = "", ...args) {
          if (typeof commands[commandName] === "function") {
            const commandRoutine = commands[commandName];
            return commandRoutine.apply(null, args);
          }
          return Promise.reject(
            new Error(`Command: "${commandName}" not registered/found`)
          );
        }
      }
    }),
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    []
  );
};
