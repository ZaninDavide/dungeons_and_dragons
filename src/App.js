import React, { Component } from 'react';
import './App.css';

let socket

if (window.location.hostname === "localhost")
    socket = window.io("localhost:5000")
else socket = window.io("http://dungeons-and-dragons-server.herokuapp.com")


let wasMenuOpen = true

let action = undefined

// drag
let viewX_before = 0
let viewY_before = 0
let downX = 0
let downY = 0
let dragged = false

// move
let moved = false

class App extends Component {
  constructor(props){
    super(props)
    this.state = {
      name: "",
      players: [],
      cellSize: 75,
      action: "drag",
      viewX: -75,
      viewY: -75,
      selection_name: undefined,
      showMenu: true,
    }
    
    this.mainRef = React.createRef()
    this.dragCircleRef = React.createRef()

    this.enterGame  = this.enterGame.bind(this)

    this.getPlayers = this.getPlayers.bind(this)
    this.getSVG     = this.getSVG.bind(this)

    this.resize    = this.resize.bind(this)
    this.mouseDown = this.mouseDown.bind(this)
    this.mouseMove = this.mouseMove.bind(this)
    this.mouseUp   = this.mouseUp.bind(this)
    this.showHideMenu = this.showHideMenu.bind(this)

    this.trySelect = this.trySelect.bind(this)
    this.isFree    = this.isFree.bind(this)
    this.deselect  = this.deselect.bind(this)

    this.coordsToCell = this.coordsToCell.bind(this)

    this.move_selected = this.move_selected.bind(this)
    this.change_selected_color = this.change_selected_color.bind(this)
    this.hp_delta_selected = this.hp_delta_selected.bind(this)

    this.getSelectionData = this.getSelectionData.bind(this)

    socket.on("players", data => {
      this.setState({
        players: data.players
      })
    })

    window.addEventListener('resize', this.resize);
  }

  // ------------------------- SERVER -------------------------

  enterGame(input_name = undefined){
    if(!input_name){
      input_name = window.prompt("Choose a name", "Name")
    }
    this.setState(old => {return {
      name: input_name
    }})

    // enter game
    socket.emit("join game", input_name)
  }

  // ------------------------- APP -------------------------

  isFree(cell){
    let found = false
    this.state.players.forEach(p => {
      if(p.x === cell.x && p.y === cell.y){
        found = true
      }
    })
    return !found
  }

  getSelectionData(attr){
    const player = this.state.players.filter(player => player.name === this.state.selection_name)[0]
    if(!player) return undefined
    return player[attr]
  }

  deselect(){
    this.setState({selection_name: undefined})
  }

  trySelect(cell){
    let found = false
    this.state.players.forEach(p => {
      if(p.x === cell.x && p.y === cell.y){
        found = true
        this.setState({
          selection_name: p.name
        })
      }
    })

    if(!found){
      this.deselect()
    }

    return found
  }

  move_selected(cell){
    // enter game
    socket.emit("move", this.state.selection_name, cell.x, cell.y)
  }

  change_selected_color(color){
    // change the color of the selection
    socket.emit("color", this.state.selection_name, color)
  }

  hp_delta_selected(delta){
    socket.emit("hp_delta", this.state.selection_name, delta)
  }

  // ------------------------- UI -------------------------

  resize(){
    this.forceUpdate()
  }

  componentDidMount(){
    this.resize()
  }

  getCoords(e){
    let clientX = e.clientX
    let clientY = e.clientY
    if(e.type === "touchend"){
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }else if(e.type.toString().startsWith("touch")){
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    if(this.mainRef.current.offsetLeft) clientX -= this.mainRef.current.offsetLeft
    if(this.mainRef.current.offsetTop) clientY -= this.mainRef.current.offsetTop
    return {x: clientX, y: clientY}
  }

  coordsToCell(coords){
    let cellX = Math.floor((coords.x + this.state.viewX) / this.state.cellSize)
    let cellY = Math.floor((coords.y + this.state.viewY) / this.state.cellSize)
    return {x: cellX, y: cellY}
  }

  mouseDown(e){
    let coor = this.getCoords(e)
    let cell = this.coordsToCell(coor)
    let free = this.isFree(cell)
    if(free){
      // SET UP FOR DRAGGING
      action = "drag"

      downX = coor.x
      downY = coor.y
      viewX_before = this.state.viewX
      viewY_before = this.state.viewY

      dragged = false
      
      this.dragCircleRef.current.setAttribute("cx", 0)
      this.dragCircleRef.current.setAttribute("cy", 0)
      this.dragCircleRef.current.setAttribute("opacity", 0)

    }else if(!free){
      // SET UP FOR MOVING
      action = "move"
      moved = false
      this.trySelect(cell)
    }
  }

  mouseMove(e){
    if(action === "drag"){
      let coor = this.getCoords(e)

      let clientX = coor.x
      let clientY = coor.y

      let deltaX = clientX - downX
      let deltaY = clientY - downY
      
      this.setState({
        viewX: viewX_before - deltaX,
        viewY: viewY_before - deltaY,
      })

      dragged = true
    }else if(action === "move"){
      let coor = this.getCoords(e)
      let cell = this.coordsToCell(coor)

      this.dragCircleRef.current.setAttribute("cx", cell.x * this.state.cellSize + this.state.cellSize / 2)
      this.dragCircleRef.current.setAttribute("cy", cell.y * this.state.cellSize + this.state.cellSize / 2)
      this.dragCircleRef.current.setAttribute("fill", this.getSelectionData("color"))
      this.dragCircleRef.current.setAttribute("opacity", .6)

      moved = true
    }
  }

  mouseUp(e){
    if(!dragged && !moved){
      // CLICK
      let coor = this.getCoords(e)
      let cell = this.coordsToCell({x: coor.x, y: coor.y})
      let free = this.isFree(cell)
      if(free){
        this.deselect()
      }else{
        this.trySelect(cell)
      }
    }

    if(action === "move" && moved){
        let coor = this.getCoords(e)
        let cell = this.coordsToCell({x: coor.x, y: coor.y})
        let free = this.isFree(cell)
        if(free) this.move_selected(cell)
    }

    action = undefined
    moved = false
    viewX_before = 0
    viewY_before = 0
    downX = 0
    downY = 0
    dragged = false

    this.dragCircleRef.current.setAttribute("cx", 0)
    this.dragCircleRef.current.setAttribute("cy", 0)
    this.dragCircleRef.current.setAttribute("opacity", 0)
  }

  showHideMenu(){
    this.setState(old => {
      return {showMenu: !old.showMenu}
    })
  }

  // ------------------------- RENDER -------------------------

  render(){
    if(wasMenuOpen !== this.state.showMenu){
      wasMenuOpen = this.state.showMenu;
      this.forceUpdate();
    }

    let mainWidth = this.mainRef.current ? this.mainRef.current.offsetWidth : 0
    let mainHeight = this.mainRef.current ? this.mainRef.current.offsetHeight : 0

    return (
      <div id="App" key="App">
        <div id="side" className={this.state.showMenu ? "" : "hiddenMenu"}>
          {this.state.name ? 
            <h2 id="nameTitle">{this.state.name}</h2> 
          : 
            <button onClick={() => this.enterGame()}>Enter game</button>
          }
          <h3>Players:</h3>
          {this.getPlayers()}
        </div>
        <div 
          id="main"
          key="main"
          ref={this.mainRef}
          onClick={this.click}
          onMouseDown={this.mouseDown}
          onMouseMove={this.mouseMove}
          onMouseUp={this.mouseUp}
          onTouchStart={this.mouseDown}
          onTouchMove={this.mouseMove}
          onTouchEnd={this.mouseUp}
        >
          <svg 
            width={mainWidth} 
            height={mainHeight} 
            viewBox={this.state.viewX + " " + this.state.viewY + " " + mainWidth + " " + mainHeight}
            key="mainSVG"
          >
            <pattern id="gridPattern" x="0" y="0" width={this.state.cellSize} height={this.state.cellSize} patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width={this.state.cellSize} height={this.state.cellSize} 
                fill="rgba(0, 0, 0, 0)" 
                stroke="var(--backColor)" 
                strokeWidth="2px"
                opacity=".3"
              />
            </pattern>
            <rect 
              id="patternRect"
              x={-1000 * this.state.cellSize} 
              y={-1000 * this.state.cellSize} 
              width={2000 * this.state.cellSize}
              height={2000 * this.state.cellSize}
              fill="url(#gridPattern)"
            />
            <circle
              id="centerCircle"
              cx="0"
              cy="0"
              r={this.state.cellSize / 25}
              fill="var(--backColor)"
              draggable={false}
            />
            <circle
              id={"draggingCircle"} key={"draggingCircle"} ref={this.dragCircleRef}
              cx={0} cy={0} r={this.state.cellSize * 0.8 / 2}
              fill={"black"} opacity={0} draggable={false}
            ></circle>
            {this.getSVG()}
          </svg>
        </div>
        {this.selectionBox()}
        {/* MENU BUTTON */}
        <div id="menuButton" onClick={this.showHideMenu}>
          MENU
        </div>
      </div>
    );
  }
  
  getPlayers(){
    return this.state.players.map(p => 
    <div 
      id={"player_" + p.name} key={"player_" + p.name} 
      className={"playerItem" + (p.name === this.state.selection_name ? " playerItemSelected" : "")}
      onClick={() => this.setState({selection_name: p.name})}
    >
      <span style={{float: "right"}}>{p.hp + "/" + p.max_hp}</span>
      <span>{p.name}</span>
    </div>
    )
  }

  selectionBox(){
    if(!this.state.selection_name) return <React.Fragment>
      <div id="selectionBox" style={{opacity: 0, display: "none"}} />
      <div id="selectionDamageButton" style={{opacity: 0, display: "none"}} />
    </React.Fragment>

    return <React.Fragment>
      <div id="selectionBox">
        <div id="selectedHp">
          <span className="selectText">{this.getSelectionData("hp")}</span>{"/" + this.getSelectionData("max_hp")}
        </div>
        <div id="selectedName">{this.state.selection_name}</div>
        <div id="selectedCa" className="selectText">{this.getSelectionData("ca")}</div>
        <div>C.A.</div>
        <div id="color-picker-wrapper" style={{backgroundColor: this.getSelectionData("color")}}><input 
          type="color" 
          onChange={e => {
            this.change_selected_color(e.target.value)
          }}
          value={this.getSelectionData("color")}
        /></div>
      </div>
      <div 
        id="selectionDamageButton"
        onClick={() => {
          this.hp_delta_selected(-1)
        }}
      >
        DAMAGE
      </div>
    </React.Fragment>
  }

  getSVG(){
    let objs = []

    // PLAYER CIRCLE
    this.state.players.forEach(p => {
      let selected = this.state.selection_name ? ( p.name === this.state.selection_name ? true : false ) : false
      objs.push(
        <circle 
          cx={p.x * this.state.cellSize + this.state.cellSize / 2} 
          cy={p.y * this.state.cellSize + this.state.cellSize / 2} 
          r={this.state.cellSize * 0.8 / 2}
          fill={p.color}
          className={
            "playerCircle" + (!selected ? " playerCircleTransition" : "") + (selected ? " selectedCircle" : "") // TODO playerCircleTransition should care about dragged if selected
          }
          id={"playerCircle_" + p.name}
          key={"playerCircle_" + p.name}
          draggable={false}
        ></circle>
      )
      objs.push(
        <text 
          x={p.x * this.state.cellSize + this.state.cellSize / 2} 
          y={p.y * this.state.cellSize + this.state.cellSize / 2 + 2} 
          fill={"white"}
          textAnchor="middle"
          alignmentBaseline="middle"
          className={
            "playerCircleText" + (selected ? " selectedCircleText" : "")
          }
          id={"playerCircleText_" + p.name}
          key={"playerCircleText_" + p.name}
          draggable={false}
        >{p.name ? p.name[0] : ""}</text>
      )
    })  
    return objs
  }
}

export default App;
