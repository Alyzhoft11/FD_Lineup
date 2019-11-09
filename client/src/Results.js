import React from "react";
import ReactLoading from "react-loading";

class Results extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      results: [],
      totalPts: 0,
      loading: false
    };
  }
  componentDidMount() {
    // this.getPlayers();
  }

  getPlayers = () => {
    const url = "http://localhost:5001/";

    fetch(url)
      .then(res => res.json())
      .then(results => {
        this.setState({
          results
        });
      });
  };

  getSGResults = () => {
    this.setState({
      loading: true
    });
    const url = "http://localhost:5001/sgresults";
    let totalPts = 0;

    fetch(url)
      .then(res => res.json())
      .then(results => {
        results.map(result => {
          totalPts += parseFloat(result.ptscalc);
        });
        this.setState({
          totalPts,
          results,
          loading: false
        });
      });
  };

  getLGResults = () => {
    this.setState({
      loading: true
    });
    const url = "http://localhost:5001/lgresults";
    let totalPts = 0;

    fetch(url)
      .then(res => res.json())
      .then(results => {
        console.log(results);
        results.map(result => {
          totalPts += parseFloat(result.ptscalc);
        });
        this.setState({
          totalPts,
          results,
          loading: false
        });
      });
  };

  getFResults = () => {
    this.setState({
      loading: true
    });
    const url = "http://localhost:5001/frresults";
    let totalPts = 0;

    fetch(url)
      .then(res => res.json())
      .then(results => {
        results.map(result => {
          totalPts += parseFloat(result.ptscalc);
        });
        this.setState({
          totalPts,
          results,
          loading: false
        });
      });
  };

  clearResults = () => {
    this.setState({
      totalPts: 0,
      results: []
    });
  };
  render() {
    if (this.state.loading == true) {
      return (
        <div>
          <div className={"loading"}>
            <ReactLoading type="spin" color="#000000" />
          </div>
        </div>
      );
    }
    if (this.state.results.length == 0 || this.state.results === undefined) {
      return (
        <div className="container">
          <button
            className="btn btn-primary mt-5 mr-2"
            onClick={this.getSGResults}
          >
            Single Game Results
          </button>
          <button
            className="btn btn-primary mt-5 mr-2"
            onClick={this.getLGResults}
          >
            Late Game Results
          </button>
          <button className="btn btn-primary mt-5" onClick={this.getFResults}>
            Full Results
          </button>
        </div>
      );
    } else if (this.state.loading) {
      return <div className="container">Loading...</div>;
    } else {
      return (
        <div className="container">
          <h1>Total Points: {this.state.totalPts} </h1>
          <table className="table-sm table-hover table-bordered">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Position</th>
                <th scope="col">Projected Points</th>
                <th scope="col">Salary</th>
                <th scope="col">Value</th>
              </tr>
              {this.state.results.map(result => (
                <tr key={result.id}>
                  <td>{result.name}</td>
                  <td>{result.position}</td>
                  <td>{result.ptscalc}</td>
                  <td>{result.salary}</td>
                  <td>{result.value}</td>
                </tr>
              ))}
            </thead>
          </table>
          <button
            className={"btn btn-primary mt-2"}
            onClick={this.clearResults}
          >
            Clear
          </button>
        </div>
      );
    }
  }
}

export default Results;
