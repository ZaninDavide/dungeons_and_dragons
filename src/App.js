import React, { Component } from 'react';
import './App.css';
import Modal from "./Modal";
import NameModal from "./NameModal";
import SpeciesModal from "./SpeciesModal";
import DiceModal from "./DiceModal";

let socket

if (window.location.hostname === "localhost")
    socket = window.io("localhost:5000")
else socket = window.io("https://dungeons-and-dragons-server.herokuapp.com")

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

    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    this.state = {
      name: "",
      isMaster: false,
      players: [],
      enemies: [],
      species: {},
      cellSize: 75,
      action: "drag",
      viewX: -vw / 2,
      viewY: -vh / 3,
      viewWidth: 500,
      viewHeight: 500,
      selection_name: undefined,
      showMenu: true,
      modalVisible: false,
      modalClose: modalValue => true,
      modalDefault: 0,
      nameModalVisible: false,
      nameModalClose: name => true,
      speciesModalVisible: false,
      speciesModalClose: (name, hp, ca) => true,
      moving: false,
      diceModalVisible: false,
    }
    
    this.mainRef = React.createRef()
    this.dragCircleRef = React.createRef()

    this.enterGame  = this.enterGame.bind(this)

    this.getPlayers = this.getPlayers.bind(this)
    this.getEnemies = this.getEnemies.bind(this)
    this.getSpecies = this.getSpecies.bind(this)
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

    socket.on("enemies", data => {
      this.setState({
        enemies: data.enemies
      })
    })

    socket.on("species", data => {
      this.setState({
        species: data.species
      })
    })


    window.addEventListener('resize', this.resize);
  }

  // ------------------------- SERVER -------------------------

  enterGame(){
    this.setState({
      nameModalVisible: true,
      nameModalClose: name => {
        if(!name) return

        this.setState({ name })
        socket.emit("join game", name)
      }
    })

  }

  // ------------------------- APP -------------------------

  isFree(cell){
    let found = false
    // search in players
    this.state.players.forEach(p => {
      if(p.x === cell.x && p.y === cell.y){
        found = true
      }
    })
    if(!found){
      // search in enemies
      this.state.enemies.forEach(en => {
        if(en.x === cell.x && en.y === cell.y){
          found = true
        }
      })
    }

    return !found
  }

  getSelectionData(attr){
    // search in players
    let entity = this.state.players.filter(player => player.name === this.state.selection_name)[0]
    if(!entity){
      // search in enemies
      entity = this.state.enemies.filter(enemy => enemy.name === this.state.selection_name)[0]
    }
    if(!entity) return undefined
    return entity[attr]
  }

  deselect(){
    this.setState({selection_name: undefined})
  }

  trySelect(cell){
    let found = false
    // ssearch in players
    this.state.players.forEach(p => {
      if(p.x === cell.x && p.y === cell.y){
        found = true
        this.setState({
          selection_name: p.name
        })
      }
    })
    
    if(!found){
      // search in enemies
      this.state.enemies.forEach(en => {
        if(en.x === cell.x && en.y === cell.y){
          found = true
          this.setState({
            selection_name: en.name
          })
        }
      })
    }

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
    let type = this.getSelectionData("type")
    if(type === "player"){
      // change the color of the selection
      socket.emit("color", this.state.selection_name, color)
    }else if(type === "enemy"){
      let sp = this.getSelectionData("species")
      if(!this.state.species[sp]) return false

      // change the color of the selection
      socket.emit("speciesColor", sp, color)

    }
  }

  hp_delta_selected(delta){
    socket.emit("hp_delta", this.state.selection_name, delta)
  }

  // ------------------------- UI -------------------------

  resize(){
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    this.setState({
      viewWidth: vw,
      viewHeight: vh,
    })
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
      this.setState({moving: false})

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
      this.dragCircleRef.current.setAttribute("opacity", .6)

      let type = this.getSelectionData("type")
      let color = "pink"
      if(type === "player"){
        color = this.getSelectionData("color") || "pink"
      }else if(type === "enemy"){
        color = this.state.species[this.getSelectionData("species")].color || "pink"
      }
      this.dragCircleRef.current.setAttribute("fill", color)

      moved = true
      this.setState({moving: true})
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
    this.setState({moving: false})
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
    return (
      <div id="App" key="App">
        <div id="side" className={this.state.showMenu ? "" : "hiddenMenu"}>
          {this.state.name ? 
            <h2 id="nameTitle">{this.state.name}</h2> 
          : [
            <button id="enterButton"  onClick={() => this.enterGame()}>Play</button>,
            <button id="masterButton" onClick={() => this.setState({name: "Master", isMaster: true})}>Master</button>
          ]}
          <h3>Players:</h3>
          {this.getPlayers()}
          { // THINGS VISIBLE ONLY TO THE MASTER
            (() => {
              if(this.state.isMaster){
                return <React.Fragment>
                  {/*<button
                    id="newEnemyButton"
                    onClick={() => socket.emit("newEnemy", "Z" + (this.state.enemies.length + 1).toString(), "zombie")}
                  >+</button>*/}
                  <h3>Species:</h3>
                  {this.getSpecies()}
                  <button
                    id="newSpeciesButton"
                    onClick={() => {
                      this.setState({
                        speciesModalVisible: true,
                        speciesModalClose: (name, hp, ca) => socket.emit("newSpecies", name, hp, ca)
                      })
                    }}
                  >+</button>
                </React.Fragment>
              }else{
                return null
              }
            })()
          }
          <h3>Enemies:</h3>
          {this.getEnemies()}
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
            width={this.state.viewWidth} 
            height={this.state.viewHeight} 
            viewBox={this.state.viewX + " " + this.state.viewY + " " + this.state.viewWidth + " " + this.state.viewHeight}
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
        {/* DICE BUTTON */}
        <div id="diceButton" onClick={() => this.setState({diceModalVisible: true})}>
          %
        </div>
        {/* MODAL */}
        <Modal 
          visible={this.state.modalVisible}
          close={value => {
            this.state.modalClose(value)
            this.setState({modalVisible: false})
          }}
          abort={() => this.setState({modalVisible: false})}
          default={0/*this.state.modalDefault*/}
        />
        {/* SPECIES MODAL */}
        <SpeciesModal 
          visible={this.state.speciesModalVisible}
          close={(name, hp, ca) => {
            this.state.speciesModalClose(name, hp, ca)
            this.setState({speciesModalVisible: false})
          }}
          abort={() => this.setState({speciesModalVisible: false})}
        />
        {/* NAME MODAL */}
        <NameModal 
          visible={this.state.nameModalVisible}
          close={value => {
            this.state.nameModalClose(value)
            this.setState({nameModalVisible: false})
          }}
          abort={() => this.setState({nameModalVisible: false})}
          default={"Name"}
        />
        {/* DICE MODAL */}
        <DiceModal 
          visible={this.state.diceModalVisible}
          close={sum => {
            this.setState({diceModalVisible: false})
          }}
          abort={() => this.setState({diceModalVisible: false})}
        />
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

  getEnemies(){
    return this.state.enemies.map(en => 
    <div 
      id={"enemy_" + en.name} key={"enemy_" + en.name} 
      className={"enemyItem" + (en.name === this.state.selection_name ? " enemyItemSelected" : "")}
      onClick={() => this.setState({selection_name: en.name})}
    >
      <span style={{float: "right"}}>{en.hp - en.max_hp}</span>
      <span>{en.name}</span>
    </div>
    )
  }

  getSpecies(){
    return Object.values(this.state.species).map(sp => (
      <div className="speciesItem"
        onClick={() => {
          socket.emit("newEnemy", sp.name)
        }}
      >
        <div className="speciesName">{sp.name}</div>
        <div className="speciesHp">{sp.max_hp}</div><br/>
        <div className="speciesCA">{sp.ca}</div>
      </div>
    ))
  }

  selectionBox(){
    if(!this.state.selection_name) return <React.Fragment>
      <div id="selectionBox" style={{opacity: 0, visibility: "none", pointerEvents: "none"}} />
      <div id="selectionBoxButtons" style={{opacity: 0, visibility: "none", pointerEvents: "none"}}>DAMAGE</div>
    </React.Fragment>

    let inMovingStyle = this.state.moving ? {opacity: 0.5, pointerEvents: "none"} : {} // for box and buttons

    return <React.Fragment>
      <div id="selectionBox" style={inMovingStyle}>
        <div id="selectedHp">
          {
            this.getSelectionData("type") === "player" || this.state.isMaster ? 
              <React.Fragment>
                <span onClick={() => {
                  if(this.getSelectionData("type") === "player" && (this.getSelectionData("name") === this.state.name || this.state.isMaster)){
                    this.setState({
                      modalVisible: true,
                      modalClose: value => socket.emit("changePlayerMaxHp", this.getSelectionData("name"), value),
                      modalDefault: this.getSelectionData("max_hp"),
                    })
                  }
                }} style={{cursor: "pointer"}}>
                  <span className="selectText">{this.getSelectionData("hp")}</span>{"/" + this.getSelectionData("max_hp")}
                </span>
              </React.Fragment>
            :
              <React.Fragment>
                <span className="selectText">{this.getSelectionData("hp") - this.getSelectionData("max_hp")}</span>
              </React.Fragment>
          }
        </div>
        <div id="selectedName">{this.state.selection_name}</div>
        {
          this.getSelectionData("type") === "player" || this.state.isMaster ?
            <React.Fragment>
              <div 
                id="selectedCa" className="selectText"
                onClick={() => {
                  if(this.getSelectionData("type") === "player" && (this.getSelectionData("name") === this.state.name || this.state.isMaster)){
                    this.setState({
                      modalVisible: true,
                      modalClose: value => socket.emit("changePlayerCA", this.getSelectionData("name"), value),
                      modalDefault: this.getSelectionData("ca"),
                    })
                  }
                }} 
                style={{cursor: "pointer"}}
              >{this.getSelectionData("ca")}</div>
              <div>C.A.</div>
            </React.Fragment>
          : null
        }
        <div id="color-picker-wrapper" 
          style={(() => {
            let type = this.getSelectionData("type")
            if(type === "player"){
              return {backgroundColor: this.getSelectionData("color")}
            }else if(type === "enemy"){
              let sp = this.getSelectionData("species")
              if(!this.state.species[sp]) return {backgroundColor: "#ff00ff"}
              return {backgroundColor: this.state.species[sp].color}
            }
          })()}
        ><input 
          type="color" 
          onChange={e => {
            this.change_selected_color(e.target.value)
          }}
          value={this.getSelectionData("color")}
        /></div>
      </div>
      <div id="selectionBoxButtons" style={inMovingStyle}>
        <div 
          id="selectionDamageButton" className="selectionBoxButton"
          onClick={() => {
            this.setState({
              modalVisible: true,
              modalClose: value => this.hp_delta_selected(-value),
              modalDefault: 0,
            })
          }}
        >DAMAGE</div>
        <div 
          id="selectionHealButton" className="selectionBoxButton"
          onClick={() => {
            this.setState({
              modalVisible: true,
              modalClose: value => this.hp_delta_selected(+value),
              modalDefault: 0,
            })
          }}
        >HEAL</div>
        {this.state.isMaster && this.getSelectionData("type") === "enemy" ? <div 
          id="selectionRemoveButton" className="selectionBoxButton"
          onClick={() => socket.emit("removeEnemie", this.getSelectionData("name"))}
        >REMOVE</div> : null}
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
          opacity={p.hp > 0 ? 1 : .5}
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
          fill={p.hp > 0 ? "white" : "var(--backColor)"}
          opacity={p.hp > 0 ? 1 : .5}
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

    // ENEMY CIRCLE
    this.state.enemies.forEach(en => {
      let selected = this.state.selection_name ? ( en.name === this.state.selection_name ? true : false ) : false
      objs.push(
        <circle 
          cx={en.x * this.state.cellSize + this.state.cellSize / 2} 
          cy={en.y * this.state.cellSize + this.state.cellSize / 2} 
          r={this.state.cellSize * 0.8 / 2}
          fill={this.state.species[en.species] ? this.state.species[en.species].color : "pink"}
          className={
            // really this is an ENEMY
            "playerCircle" + (!selected ? " playerCircleTransition" : "") + (selected ? " selectedCircle" : "") // TODO playerCircleTransition should care about dragged if selected
          }
          id={"enemyCircle_" + en.name}
          key={"enemyCircle_" + en.name}
          draggable={false}
          opacity={en.hp > 0 ? 1 : .5}
        ></circle>
      )
      objs.push(
        <text 
          x={en.x * this.state.cellSize + this.state.cellSize / 2 + 1} 
          y={en.y * this.state.cellSize + this.state.cellSize / 2 + 3} 
          fill={en.hp > 0 ? "white" : "var(--backColor)"}
          opacity={en.hp > 0 ? 1 : .5}
          textAnchor="middle"
          alignmentBaseline="middle"
          className={
            // really this is an ENEMY
            "playerCircleText" + (selected ? " selectedCircleText" : "")
          }
          id={"enemyCircleText_" + en.name}
          key={"enemyCircleText_" + en.name}
          draggable={false}
        >{en.name ? en.name.substr(0, Math.min(3, en.name.length)) : ""}</text>
      )
    })  
    return objs
  }
}

export default App;
