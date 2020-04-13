import React, { Component } from "react"

class DiceModal extends Component {
  constructor(props) {
    super(props)
    this.state = {
        value: 0,
        fulSum: ""
    }
    this.getStyle = this.getStyle.bind(this);
    this.close = this.close.bind(this);
    this.dice = this.dice.bind(this);
  }

  getStyle(){
    return {
      display: this.props.visible ? "block" : "none",
      backgroundColor: this.props.visible ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0)",
    }
  }

  close(){
    this.props.close(this.state.value)
  }

  componentWillReceiveProps(nextProps) {
    if(nextProps.visible !== this.props.visible){
        this.setState({value: 0, fulSum: ""})
    }
  }

  dice(n, k = 1){
    const r = Math.random()
    const d = (Math.floor(n * r) + 1) * k
    this.setState(old => {
      return {
        value: old.value + d,
        fulSum: old.fulSum + (old.fulSum.length > 0 ? " + " : "") + d + "/" + (n * k)
      }
    })
  }

  render() {
    return (
      <div id="backModal" onClick={this.props.abort} style={this.getStyle()}>
        <div id="DiceModal" onClick={e => e.stopPropagation()}>
            <div className="diceModalButton" onClick={() => this.dice(4)}>d4</div>
            <div className="diceModalButton" onClick={() => this.dice(6)}>d6</div>
            <div className="diceModalButton" onClick={() => this.dice(8)}>d8</div>
            <div className="diceModalButton" onClick={() => this.dice(10)}>d10</div><br/>
            <div className="diceModalButton" onClick={() => this.dice(12)}>d12</div>
            <div className="diceModalButton" onClick={() => this.dice(20)}>d20</div>
            <div className="diceModalButton" onClick={() => this.dice(10, 10)}>d100</div><br/>
            <p id="diceModalSumLabel">{this.state.fulSum || 0}{" = "}</p>
            <div id="diceModalOkButton" onClick={this.close}>{this.state.value}</div>
        </div>
      </div>
    )
  }

}

export default DiceModal
