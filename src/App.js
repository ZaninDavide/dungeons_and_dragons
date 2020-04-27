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

// drag
let viewX_before = 0
let viewY_before = 0
let downX = 0
let downY = 0
let dragged = false

// move
let moved = false

// true
let drawedCells = {}

// avoid transitions while zooming
let last_cellSize = 70

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
      walls: [],
      cellSize: 70,
      action: undefined,
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
    this.centerGrid = this.centerGrid.bind(this)

    this.trySelect = this.trySelect.bind(this)
    this.getCell   = this.getCell.bind(this)
    this.deselect  = this.deselect.bind(this)
    this.selectEntity = this.selectEntity.bind(this)

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

    socket.on("walls", data => {
      this.setState({
        walls: data.walls
      })
    })


    window.addEventListener('resize', this.resize);
    setInterval(() => socket.emit("keepAlive"), 1000 * 60);
  }

  // ------------------------- SERVER -------------------------

  enterGame(){
    this.setState({
      nameModalVisible: true,
      nameModalClose: name => {
        if(!name || this.state.players.filter(p => p.name === name).length > 0) return

        this.setState({ name })
        socket.emit("join game", name)
      }
    })

  }

  // ------------------------- APP -------------------------

  getCell(cell){
    let res = undefined

    // search in players
    this.state.players.forEach(p => {
      if(p.x === cell.x && p.y === cell.y){
        res = {free: false, obj: p, canMove: true, canSelect: true}
      }
    })
    
    if(!res){
      // search in enemies
      this.state.enemies.forEach(en => {
        if(en.x === cell.x && en.y === cell.y){
          res = {x: cell.x, y: cell.y, free: false, obj: en, canMove: true, canSelect: true}
        }
      })
    }

    if(!res){
      // search in walls
      this.state.walls.forEach(w => {
        if(w.x === cell.x && w.y === cell.y){
          res = {x: cell.x, y: cell.y, free: false, obj: w, canMove: false, canSelect: false}
        }
      })
    }

    if(res){
      return res
    }else{
      return {x: cell.x, y: cell.y, free: true, obj: null, canMove: false, canSelect: false}
    }
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

  selectEntity(entity){
    this.setState({
      selection_name: entity.name
    })
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
    if(this.state.action !== "addWalls" && this.state.action !== "removeWalls"){ 
      // if not drawing wall
      let coor = this.getCoords(e)
      let cell = this.coordsToCell(coor)
      let cellInfo = this.getCell(cell)
      
      if(!cellInfo.canMove){
        // SET UP FOR DRAGGING
        this.setState({action: "drag"})
  
        downX = coor.x
        downY = coor.y
        viewX_before = this.state.viewX
        viewY_before = this.state.viewY
  
        dragged = false
        
        this.dragCircleRef.current.setAttribute("cx", 0)
        this.dragCircleRef.current.setAttribute("cy", 0)
        this.dragCircleRef.current.setAttribute("opacity", 0)
  
      }else{
        // SET UP FOR MOVING
        this.setState({action: "move"})
  
        moved = false
        this.setState({moving: false})
  
        //this.trySelect(cell)
        if(cellInfo.canSelect){
          this.selectEntity(cellInfo.obj)
        }
      }
    }else{
      drawedCells = {}
    }
  }

  mouseMove(e){
    if(this.state.action !== "addWalls" && this.state.action !== "removeWalls"){ 
      // if not drawing wall
      if(this.state.action === "drag"){
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

      }else if(this.state.action === "move"){
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
    }else if(e.buttons === 1){ 
      // adding or removing walls
      let coor = this.getCoords(e)
      let cellInfo = this.getCell(this.coordsToCell(coor))
      if(!drawedCells[cellInfo.x.toString() + "," + cellInfo.y.toString()]){
        if(cellInfo.free && this.state.action === "addWalls"){
          socket.emit("addWall", cellInfo.x, cellInfo.y)
          drawedCells[cellInfo.x.toString() + "," + cellInfo.y.toString()] = true
        }else if(!cellInfo.free && this.state.action === "removeWalls"){
          if(cellInfo.obj.type === "wall"){
            socket.emit("removeWall", cellInfo.x, cellInfo.y)
            drawedCells[cellInfo.x.toString() + "," + cellInfo.y.toString()] = true
          }
        }
      }
    }
  }

  mouseUp(e){
    if(this.state.action !== "addWalls" && this.state.action !== "removeWalls"){
      // if not drawing walls 
      if(!dragged && !moved){
        // CLICK
        let coor = this.getCoords(e)
        let cell = this.coordsToCell({x: coor.x, y: coor.y})
        let cellInfo = this.getCell(cell)
        if(!cellInfo.canSelect){
          this.deselect()
        }else{
          // this.trySelect(cell)
          if(cellInfo.canSelect){
            this.selectEntity(cellInfo.obj)
          }
        }
      }
    
      if(this.state.action === "move" && moved){
        let coor = this.getCoords(e)
        let cell = this.coordsToCell({x: coor.x, y: coor.y})
        let cellInfo = this.getCell(cell)
        
        if(cellInfo.free) this.move_selected(cell)
      }

      moved = false
      this.setState({action: undefined, moving: false})
      viewX_before = 0
      viewY_before = 0
      downX = 0
      downY = 0

      dragged = false

      this.dragCircleRef.current.setAttribute("cx", 0)
      this.dragCircleRef.current.setAttribute("cy", 0)
      this.dragCircleRef.current.setAttribute("opacity", 0)
    }else if(drawedCells){
      // adding or removing walls
      let coor = this.getCoords(e)
      let cellInfo = this.getCell(this.coordsToCell(coor))
      if(cellInfo.free && this.state.action === "addWalls"){
        socket.emit("addWall", cellInfo.x, cellInfo.y)
      }else if(!cellInfo.free && this.state.action === "removeWalls"){
        if(cellInfo.obj.type === "wall"){
          socket.emit("removeWall", cellInfo.x, cellInfo.y)
        }
      }
      drawedCells = {}
    }

  }

  showHideMenu(){
    this.setState(old => {
      return {showMenu: !old.showMenu}
    })
  }

  centerGrid(){
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    this.setState({
      viewX: -vw / 2,
      viewY: -vh / 3
    })
  }

  // ------------------------- RENDER -------------------------

  render(){
    return (
      <div id="App" key="App">
        <div id="side" className={!this.state.showMenu || this.state.action === "addWalls" || this.state.action === "removeWalls" ? "hiddenMenu" : ""}>
          {this.state.name ? 
            <h2 id="nameTitle">{this.state.name}</h2> 
          : [
            <button id="enterButton" key="enterButton"  onClick={() => this.enterGame()}>Play</button>,
            <button id="masterButton" key="masterButton" onClick={() => this.setState({name: "Master", isMaster: true})}>Master</button>
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
          onDoubleClick={this.centerGrid}
          onWheel={e => {
            const d = 1 - e.deltaY * 0.001
            this.setState(old => {
              return {cellSize: Math.max(old.cellSize * d, 10)}
            })
          }}
        >
          <svg 
            width={this.state.viewWidth} 
            height={this.state.viewHeight} 
            viewBox={this.state.viewX + " " + this.state.viewY + " " + this.state.viewWidth + " " + this.state.viewHeight}
            key="mainSVG"
          >
            <pattern id="gridPattern" x="0" y="0" width={this.state.cellSize} height={this.state.cellSize} patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width={this.state.cellSize} height={this.state.cellSize} 
                fill="lightgray"
              />
              <rect x="1" y="1" width={this.state.cellSize - 2} height={this.state.cellSize - 2} 
                fill="white"
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
            {this.getSVG()}
            <circle
              id="centerCircle"
              cx="0"
              cy="0"
              r={this.state.cellSize / 50 + 3}
              fill="var(--selectColor)"
              draggable={false}
            />
            <circle
              id={"draggingCircle"} key={"draggingCircle"} ref={this.dragCircleRef}
              cx={0} cy={0} r={this.state.cellSize * 0.8 / 2}
              fill={"black"} opacity={0} draggable={false}
            ></circle>
          </svg>
        </div>
        {this.selectionBox()}
        {this.state.action !== "addWalls" && this.state.action !== "removeWalls" ?
          <React.Fragment>
            {/* MENU BUTTON */}
            <div id="menuButton" onClick={this.showHideMenu}>
              MENU
            </div>
            {/* DICE BUTTON */}
            <div id="diceButton" onClick={() => this.setState({diceModalVisible: true})}>
              %
            </div>
          </React.Fragment>
        : 
          <React.Fragment>
            {/* STOP DRAWING BUTTON */}
            <div id="stopDrawingButton" onClick={() => this.setState({action: undefined})}>
              DONE
            </div>
          </React.Fragment>
        }
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
        {this.state.action !== "addWalls" && this.state.action !== "removeWalls" ? 
          <React.Fragment>  
            <div id="addWallsButton" className={this.state.showMenu ? "" : "wallButtonClosedMenu"} onClick={() => this.setState({action: "addWalls", selection_name: undefined})}>DRAW</div>
            <div id="removeWallsButton" className={this.state.showMenu ? "" : "wallButtonClosedMenu"} onClick={() => this.setState({action: "removeWalls", selection_name: undefined})}>ERASE</div>
            <div id="zoomOutButton" className={this.state.showMenu ? "" : "zoomButtonClosedMenu"} onClick={() => this.setState(old => {return {cellSize: Math.max(old.cellSize * 9 / 10, 10)}})}>-</div>
            <div id="zoomInButton" className={this.state.showMenu ? "" : "zoomButtonClosedMenu"} onClick={() => this.setState(old => {return {cellSize: old.cellSize * 10 / 9}})}>+</div>
          </React.Fragment>
        : null}
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
                }} style={{cursor: (this.getSelectionData("type") === "player" && (this.getSelectionData("name") === this.state.name || this.state.isMaster)) ? "pointer" : ""}}>
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
                style={{cursor: (this.getSelectionData("type") === "player" && (this.getSelectionData("name") === this.state.name || this.state.isMaster)) ? "pointer" : ""}}
              >{this.getSelectionData("ca")}</div>
              <div>C.A.</div>
          </React.Fragment>
          : null
        }
        {
          this.getSelectionData("type") === "player" ?
            <React.Fragment>
              <div 
                id="selectedIni" className="selectText"
                onClick={() => {
                  if(this.getSelectionData("type") === "player" && (this.getSelectionData("name") === this.state.name || this.state.isMaster)){
                    this.setState({
                      modalVisible: true,
                      modalClose: value => socket.emit("changePlayerIni", this.getSelectionData("name"), value),
                      modalDefault: this.getSelectionData("ini"),
                    })
                  }
                }} 
                style={{cursor: (this.getSelectionData("type") === "player" && (this.getSelectionData("name") === this.state.name || this.state.isMaster)) ? "pointer" : ""}}
              >{this.getSelectionData("ini")}</div>
              <div>Initiative</div>
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
          value={(() => {
            let type = this.getSelectionData("type")
            if(type === "player"){
              return this.getSelectionData("color")
            }else if(type === "enemy"){
              let sp = this.getSelectionData("species")
              if(!this.state.species[sp]) return "#ff00ff"
              return this.state.species[sp].color
            }
          })()}
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
    let just_zoomed = this.state.cellSize !== last_cellSize
    if(just_zoomed) last_cellSize = this.state.cellSize

    // WALLS
    this.state.walls.forEach(w => {
      objs.push(
        <rect
          x={w.x * this.state.cellSize - 1} 
          y={w.y * this.state.cellSize - 1} 
          width={this.state.cellSize + 2}
          height={this.state.cellSize + 2}
          fill={"var(--backColor)"}
        ></rect>
      )
    })

    // PLAYER CIRCLE
    this.state.players.forEach(p => {
      let selected = this.state.selection_name ? ( p.name === this.state.selection_name ? true : false ) : false
      let cx = p.x * this.state.cellSize + this.state.cellSize / 2
      let cy = p.y * this.state.cellSize + this.state.cellSize / 2
      objs.push(
        <circle 
          cx={cx} 
          cy={cy}
          r={this.state.cellSize * 0.8 / 2}
          fill={p.color}
          opacity={p.hp > 0 ? 1 : .5}
          className={
            "playerCircle" + (!selected & !just_zoomed ? " playerCircleTransition" : "") + (selected ? " selectedCircle" : "") // TODO playerCircleTransition should care about dragged if selected
          }
          id={"playerCircle_" + p.name}
          key={"playerCircle_" + p.name}
          draggable={false}
        ></circle>
      )
      objs.push(
        <text
          x={0}
          y={0}
          style={{
            transform: `translate(${cx}px, ${cy + 2}px)`,
            fontSize: 25 * this.state.cellSize / 70
          }}
          fill={p.hp > 0 ? "white" : "var(--backColor)"}
          opacity={p.hp > 0 ? 1 : .5}
          textAnchor="middle"
          alignmentBaseline="middle"
          className={
            "playerCircleText" + (selected ? " selectedCircleText" : "") + (!selected & !just_zoomed ? " playerCircleTextTransition" : "")
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
      let cx = en.x * this.state.cellSize + this.state.cellSize / 2
      let cy = en.y * this.state.cellSize + this.state.cellSize / 2
      objs.push(
        <circle 
          cx={cx} 
          cy={cy}
          r={this.state.cellSize * 0.8 / 2}
          fill={this.state.species[en.species] ? this.state.species[en.species].color : "pink"}
          className={
            // really this is an ENEMY
            "playerCircle" + (!selected & !just_zoomed ? " playerCircleTransition" : "") + (selected ? " selectedCircle" : "") // TODO playerCircleTransition should care about dragged if selected
          }
          id={"enemyCircle_" + en.name}
          key={"enemyCircle_" + en.name}
          draggable={false}
          opacity={en.hp > 0 ? 1 : .5}
        ></circle>
      )
      objs.push(
        <text 
          x={0}
          y={0}
          style={{
            transform: `translate(${cx}px, ${cy + 2}px)`,
            fontSize: 25 * this.state.cellSize / 70
          }}
          fill={en.hp > 0 ? "white" : "var(--backColor)"}
          opacity={en.hp > 0 ? 1 : .5}
          textAnchor="middle"
          alignmentBaseline="middle"
          className={
            // really this is an ENEMY
            "playerCircleText" + (selected ? " selectedCircleText" : "") + (!selected & !just_zoomed ? " playerCircleTextTransition" : "")
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
