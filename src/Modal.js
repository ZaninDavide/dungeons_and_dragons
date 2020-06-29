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
                className="iconText"
                onClick={() => this.setState(old => {return {value: Math.max(old.value - 1, 0)}})}
            >chevron_left</div>
            <input type="text" id="modalLabel" value={this.state.value} onChange={e => {
              let n = parseInt(e.target.value)
              if(!isNaN(n)) this.setState({value: Math.max(parseInt(e.target.value), 0)})
              if(e.target.value === "") this.setState({value: 0})
            }}></input>
            <div
                id="modalMinusButton" 
                className="iconText"
                onClick={() => this.setState(old => {return {value: old.value + 1}})}
            >chevron_right</div><br/><br/>
            <div id="modalOkButton" className="iconText" onClick={this.close}>done</div>
        </div>
      </div>
    )
  }

}

export default Modal
