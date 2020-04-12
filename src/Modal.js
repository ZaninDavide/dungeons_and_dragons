import React, { Component } from "react"

class Modal extends Component {
  constructor(props) {
    super(props)
    this.state = {
        value: this.props.default || 0,
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
        <div id="Modal" onClick={e => e.stopPropagation()}>
            <div 
                id="modalPlusButton"
                onClick={() => this.setState(old => {return {value: Math.max(old.value - 1, 0)}})}
            >{"<"}</div>
            <div id="modalLabel">{this.state.value}</div>
            <div
                id="modalMinusButton" 
                onClick={() => this.setState(old => {return {value: old.value + 1}})}
            >{">"}</div><br/><br/>
            <div id="modalOkButton" onClick={this.close}>OK</div>
        </div>
      </div>
    )
  }

}

export default Modal
