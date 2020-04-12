import React, { Component } from "react"

class SpeciesModal extends Component {
  constructor(props) {
    super(props)
    this.state = {
        name: "zombie",
        hp: 10,
        ca: 5,
    }
    this.getStyle = this.getStyle.bind(this);
    this.close = this.close.bind(this);
  }

  getStyle(){
    return {
      display: this.props.visible ? "block" : "none",
      backgroundColor: this.props.visible ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0)",
    }
  }

  close(){
    this.props.close(this.state.name, this.state.hp, this.state.ca)
  }

  componentWillReceiveProps(nextProps) {
    if(nextProps.visible !== this.props.visible){
        this.setState({
          hp: 10,
          ca: 5,
        })
    }
  }

  render() {
    return (
      <div id="backModal" onClick={this.props.abort} style={this.getStyle()}>
        <div id="SpeciesModal" onClick={e => e.stopPropagation()}>
          <input id="speciesModalTextbox" type="text" onChange={e => this.setState({name: e.target.value})} value={this.state.name}/><br/>
          <div id="speciesModalHpLabel">{"HP"}</div>
          <div className="speciesModalMinus" 
            onClick={() => this.setState(old => {return {hp: Math.max(0, old.hp - 1)}})}
          >{"<"}</div>
          <div id="speciesModalHp">{this.state.hp}</div>
          <div className="speciesModalPlus" 
            onClick={() => this.setState(old => {return {hp: old.hp + 1}})}
          >{">"}</div><br/>

          <div id="speciesModalCALabel">{"CA"}</div>
          <div className="speciesModalMinus"
            onClick={() => this.setState(old => {return {ca: Math.max(0, old.ca - 1)}})}
          >{"<"}</div>
          <div id="speciesModalCA">{this.state.ca}</div>
          <div className="speciesModalPlus"
            onClick={() => this.setState(old => {return {ca: old.ca + 1}})}
          >{">"}</div><br/>

          <div id="speciesModalOkButton" onClick={this.close}>OK</div>
        </div>
      </div>
    )
  }

}

export default SpeciesModal
