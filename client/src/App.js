import React from "react";
import { render } from "react-dom";
import Results from "./Results";

class App extends React.Component {
  render() {
    return <Results />;
  }
}

render(<App />, document.getElementById("root"));
