import React, { Component } from "react"

class NameModal extends Component {
  constructor(props) {
    super(props)
    this.state = {
        value: this.props.default || "",
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
    this.props.close(this.state.value)
  }

  componentWillReceiveProps(nextProps) {
    if(nextProps.visible !== this.props.visible){
        this.setState({value: nextProps.default || this.props.default || 0})
    }
  }

  render() {
    return (
      <div id="backModal" onClick={this.props.abort} style={this.getStyle()}>
        <div id="NameModal" onClick={e => e.stopPropagation()}>
            <input id="nameModalTextbox" type="text" onChange={e => this.setState({value: e.target.value})} value={this.state.value}/><br/>
            <div id="modalOkButton" onClick={this.close}>OK</div>
        </div>
      </div>
    )
  }

}

export default NameModal
