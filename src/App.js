import "./styles.css";
// import { useRef } from "react";

import { useAppState, useCommands } from "./hooks";

export default function App() {
  // const printRef = useRef(null);

  /* @HINT: Use commands to execute common user interactions tasks: print(), copy(), paste() */
  const commands = useCommands();
  /* @HINT: Easily switch between "signals" and "state container" for handling application state */
  const [headingText, setHeaderText] = useAppState(
    "Hello CodeSandbox",
    true /* boolean => use signals */
  );

  return (
    <>
      <div className="App">
        <h1>{headingText}</h1>
        <h2>Start editing to see some magic happen!</h2>
      </div>
      <div className="Extra">
        <button
          type="button"
          style={{
            backgroundColor: "lightblack",
            color: "gray",
            cursor: "pointer"
          }}
          onClick={() => setHeaderText("Hello Me!")}
        >
          UPDATE TEXT
        </button>{" "}
        <button
          type="button"
          style={{
            backgroundColor: "gray",
            color: "white",
            border: "1px solid black",
            cursor: "pointer"
          }}
          onClick={() => commands.hub.execute("print", null)}
        >
          PRINT
        </button>
      </div>
    </>
  );
}
