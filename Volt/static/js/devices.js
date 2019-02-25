const React = require('react');
const ReactDOM = require('react-dom');
import {
  ComposableMap,
  ZoomableGroup,
  Geographies,
  Geography,
  Markers,
  Marker,
} from "react-simple-maps"

import {fetchDevices} from "./api_handler";


const wrapperStyles = {
    width: "38%",
    // maxWidth: 980,
    margin: "0 auto",
    border: "1px solid black",
    float: "left",
};

const countries = [
    "FIN", "SWE", "EST", "RUS", "NOR", "LTU", "LVA", "ALD",
];

const markers = [
    { markerOffset: 20, name: 'Helsinki', coordinates: [ 24.945831, 60.192059], state: "green"},
    { markerOffset: 20, name: 'Test_1', coordinates: [ 24.945830, 60.192058], state: "green"},
    { markerOffset: 20, name: 'Test_2', coordinates: [ 24.945830, 61.192058], state: "orange"},
    { markerOffset: 20, name: 'Test_3', coordinates: [ 23.945830, 60.192058], state: "green"},
    { markerOffset: 20, name: 'Test_4', coordinates: [ 22.945830, 64.192058], state: "orange"},
    { markerOffset: 20, name: 'Test_5', coordinates: [ 26.945830, 65.192058], state: "red"},
    // { markerOffset: -25, name: "Buenos Aires", coordinates: [-58.3816, -34.6037] },
    // { markerOffset: -25, name: "La Paz", coordinates: [-68.1193, -16.4897] },
    // { markerOffset: 35, name: "Brasilia", coordinates: [-47.8825, -15.7942] },
    // { markerOffset: 35, name: "Santiago", coordinates: [-70.6693, -33.4489] },
    // { markerOffset: 35, name: "Bogota", coordinates: [-74.0721, 4.7110] },
    // { markerOffset: 35, name: "Quito", coordinates: [-78.4678, -0.1807] },
    // { markerOffset: -25, name: "Georgetown", coordinates: [-58.1551, 6.8013] },
    // { markerOffset: -25, name: "Asuncion", coordinates: [-57.5759, -25.2637] },
    // { markerOffset: 35, name: "Paramaribo", coordinates: [-55.2038, 5.8520] },
    // { markerOffset: 35, name: "Montevideo", coordinates: [-56.1645, -34.9011] },
    // { markerOffset: -25, name: "Caracas", coordinates: [-66.9036, 10.4806] },
];

Array.prototype.remove = function(value) {
    this.splice(this.indexOf(value), 1);
    return this;
};


class MarkerMeta  {
    constructor(parent, i, width, marker) {
        this.index = parseInt(i);
        this.parent = parent;
        this.r = width / 2;
        this.name = marker.name;
        this.markerOffset = marker.markerOffset;
        this.coordinates = marker.coordinates;
        this.coordinates_orig = marker.coordinates;
        this.color = marker.state;
        this.styles = {
            rect: {fill: "transparent"},
            circle: {stroke: this.color, fill: this.color, strokeWidth: 1, opacity: 1,},
            svg: {width: 20, height: 20, verticalAlign: "middle",}, //todo: container svg dim = x2 max cirle radius
            Marker: {default: { fill: "#FF5722", outline: "none" }},
            text: {
                fontFamily: "Roboto, sans-serif",
                fill: "#607D8B",
                //
                userSelect: "none",
                MozUserSelect: "none",
                KhtmlUserSelect: "none",
                WebkitUserSelect: "none",
                msUserSelect: "none",
                WebkitTouchCallout: "none",
                //
            },
            span: {verticalAlign: "middle",}
        };
        this.styles.Marker.hover = this.styles.Marker.default;
        this.styles.Marker.pressed = this.styles.Marker.default;

        // noinspection JSUnusedGlobalSymbols
        this.onMap = {
            onClick: ev => this.setParent(ev, {selection: 'map', selected: [this.index]},),
            onMouseOver: ev => this.setParent(ev, {hovered: [this.index]},),
            onMouseOut: ev => this.setParent(ev, {hovered: this.parent.state.hovered.remove(this.index)},),
        };

        // noinspection JSUnusedGlobalSymbols
        this.onList = {
            onClick: ev => this.setParent(ev, {selection: 'list', selected: [this.index]},),
            onMouseOver: ev => this.setParent(ev, {hovered: [this.index]},),
            onMouseOut: ev => this.setParent(ev, {hovered: this.parent.state.hovered.remove(this.index)},),
        };
    }

    setParent(ev, state, cb=undefined) {
        this.parent.setState(state, cb);
        ev.stopPropagation();
    }
    
    isSelected() {
        return this.parent.state.selected.includes(this.index);
    }

    spanStyle() {
        let style = {verticalAlign: "middle",};
        this.isSelected() && (style["textDecorationLine"] = ["underline"]);
        return style;
    }

    renderAsMapItem(key) {
        let hovering = this.parent.state.hovered.includes(this.index);

        return <Marker key={key} marker={this} style={this.styles.Marker}>
            <circle cx={0} cy={0} r={hovering && this.r * 1.1 || this.r * 0.8} style={this.styles.circle}/>
            <rect width={16} height={16} x={-8} y={-8} style={this.styles.rect} {...this.onMap} />
        </Marker>;
    }

    renderAsListItem(key) {
        let hovering = this.parent.state.hovered.includes(this.index);

        return <li key={key} {...this.onList}>
            <svg style={this.styles.svg} >
                <circle cx={10} cy={10} r={hovering && 7.5 || 5} style={this.styles.circle}/>
            </svg>
            <span style={this.spanStyle()}>{ this.name }</span>
        </li>;

    }
}

class Devices extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            zoom: 1.0,
            selection: null,
            selected: [],
            hovered: [],
            markers: [],
            center: [26.945830, 65.192058],
            size: [1000, 1000],
            scale: 3500,
        };

        this.geo_style = {default: {fill: "#ECEFF1", stroke: "#607D8B", strokeWidth: 0.75, outline: "none",}};
        this.geo_style.hover = this.geo_style.default;
        this.geo_style.pressed = this.geo_style.default;
        this.map = React.createRef();
        this.can_zoom = true;
        this.min_marker_dim = 30  // Max. markers on shorter edged
    }

    componentDidMount() {
        setInterval(this.fetchDevices.bind(this), 10000);
        this.fetchDevices();
    }

    fetchDevices() {
        fetchDevices()
            .then(result => result.devices.map(d => {
                d.coordinates = [d.lon, d.lat];
                let m = d.last_measurement;
                d.state = m === undefined && 'grey'
                    || m < 11.5 && 'red'
                    || m < 11.9 && 'orange'
                    || m < 15.0 && 'green'
                    || 'black';
                return d;
            }))
            .then(devices => {
                this.state.markers = devices.map((m, i) => new MarkerMeta(this, i, this.min_marker_dim, m));
                this.positionMarkers(this.state.zoom, this.state.center);
            })
    }

    zoom(ev) {
        ev.preventDefault();
        if(this.can_zoom) {
            let z = this.state.zoom - ev.deltaY / 50.0 * this.state.zoom;
            this.positionMarkers(z, this.state.center);
        }
    }

    positionMarkers(zoom, center){
        let projection = this.map.current.projection().scale(this.state.scale * zoom).center(center);
        let inversion = projection.invert;
        // let bounds = [...inversion([0,0]), ...inversion(this.state.size)]; // todo: display out-of-bounds markers on the edge of map?
        let div = this.min_marker_dim;
        let step = Math.min(this.state.size[0] / div, this.state.size[1] / div);

        let marker_pos = {};
        this.state.markers.forEach((m, i) => {
            let xy = projection(m.coordinates_orig);
            xy[0] = Math.round(xy[0] / step);
            xy[1] = Math.round(xy[1] / step);
            if(marker_pos[xy]) { // Óutward spiral search algorithm for empty spot
                xy[0]++;
                let edge_dist = 1;
                let turns = 1;
                let dir = [0, 1];
                let steps_in_dir = 0;
                while (marker_pos[xy]) {
                    xy[0] += dir[0];
                    xy[1] += dir[1];
                    steps_in_dir++;
                    if (steps_in_dir === edge_dist) {
                        turns++;
                        steps_in_dir = 0;
                        if (turns === 2) {
                            turns = 0;
                            edge_dist++;
                        }
                        let temp = dir[0];
                        dir[0] = -dir[1];
                        dir[1] = temp;
                    }
                }
            }
            marker_pos[xy] = true;
            xy[0] *= step;
            xy[1] *= step;
            m.coordinates = inversion(xy);
        });

        this.setState({zoom: zoom, center: center});
    }



    render() {
        return <div style={{display: "flex"}}  onClick={ev =>this.setState({selected: []}, )} >
            <div style={wrapperStyles} onWheel={ev => this.zoom(ev)} >
            <ComposableMap
                ref={this.map}
                projectionConfig={{ scale: 3500 }} //todo: set better projection
                width={this.state.size[0]} height={this.state.size[1]}
                style={{width: "100%", height: "auto"}}>
                <ZoomableGroup center={this.state.center} zoom={this.state.zoom}
                               onMoveStart={() => this.can_zoom=false}
                               onMoveEnd={ev => {
                                    this.positionMarkers(this.state.zoom, ev);
                                    this.setState({center: ev}, () => this.can_zoom=true)}}
                >
                <Geographies geography="/static/world.json">
                    {(geographies, projection) =>
                        geographies.map((geography, i) =>
                            countries.indexOf(geography.id) !== -1 && (
                            <Geography key={i} geography={geography} projection={projection} style={this.geo_style}/>
                        )
                    )
                }
                </Geographies>
                <Markers>
                    {this.state.markers.map((m, i) => m.renderAsMapItem(i))}
                </Markers>
              </ZoomableGroup>
            </ComposableMap>
            </div>
            <div style={{flexGrow: 1,}} >
                <ul style={{listStyle: "none", padding: 0,}}>
                    {this.state.markers.map((m, i) => m.renderAsListItem(i))}
                </ul>
            </div>
        </div>;
    }
}



// // drop-in replacement for Snap.load, with caching
// const cache = {};
// export function load(path, callback) {
//   if (cache[path]) {
//     callback(Snap(cache[path].node.cloneNode(true)))
//   } else {
//     Snap.load(path, (img) => {
//       cache[path] = Snap(img.node.cloneNode(true));
//       callback(img);
//     })
//   }
// }

// class MarkerSVG extends React.Component {
//     constructor(props){
//         super(props);
//         const circle =`
//         M 50,1
//         C 50,1   1,1   1,50
//         C 1,50  1,99  50,99
//         C 50,99 99,99 99,50
//         C 99,50  99,1  50,1`;
//         const diamond =`
//         M 50,1
//         C 50,1  50,1   1,50
//         C 1,50  1,50  50,99
//         C 50,99 50,99 99,50
//         C 99,50 99,50 50,1`;
//         const thinstar4 =`
//         M 50,1
//         C 50,1  50,50  1,50
//         C 1,50  50,50 50,99
//         C 50,99 50,50 99,50
//         C 99,50 50,50 50,1`;
//         const heart =`
//         M 50,50
//         C 50,50 25,0  1,50
//         C 1,50  50,99 50,99
//         C 50,99 99,50 99,50
//         C 99,50 75,0  50,50`;
//
//         this.state = {
//             values: [thinstar4, circle],
//             hover: false,
//         };
//
//         const reverseAnim = () => {
//             let anim = this.animations.hover.current;
//             let start_time;
//             try  { start_time  = anim.getStartTime() } catch (e) { start_time = -10 }
//             let restart_offset = (anim.getCurrentTime() - start_time) - 5;
//             restart_offset > 0 && (restart_offset = 0);
//             restart_offset < -5 && (restart_offset = -5);
//
//             console.log(anim.getCurrentTime(), start_time);
//             // console.log(restart_offset);
//
//
//             anim.endElementAt(restart_offset);
//             // anim.beginElementAt(restart_offset);
//             return restart_offset
//         };
//
//         this.on = {
//             onMouseOver: () => {
//                 let offset = reverseAnim();
//                 this.setState({values: [circle, thinstar4]},
//                     () => this.animations.hover.current.beginElementAt(offset));
//             },
//             onMouseOut: () => {
//                 let offset = reverseAnim();
//                 this.setState({ values: [thinstar4, circle]},
//                     () => this.animations.hover.current.beginElementAt(offset));
//             },
//         };
//
//         this.animations = {
//             hover: React.createRef(),
//         }
//     }
//
//
//     render() {
// const circle =`
// M 50,1
// C 50,1   1,1   1,50
// C 1,50  1,99  50,99
// C 50,99 99,99 99,50
// C 99,50  99,1  50,1`;
//         const anim1 = <animate
//             ref={this.animations.hover}
//             attributeName="d"
//             values={this.state.values.join(';')}
//             keyTimes= "0; 1;"
//             calcMode="linear"
//             dur="5s"
//             fill="freeze"
//             begin="indefinite"
//         />;
//
//         return (
//             <svg className='marker' width={333} height={200} viewBox="0 0 100 100">
//                 <path fill="red" d={circle}>
//                     {anim1}
//                 </path>
//                 <rect fill="transparent" width="100" height="100" x="0" y="0" {...this.on}/>
//             </svg>
//         );
//     }
//
//     componentDidMount() {
//         // this.animations.hover.current.beginElement();
//     }
// }
// // M 50,1 A 50,50 0 0 0 1,50 A 50,50 0 0 0 50,99 A 50,50 0 0 0 99,50 A 50,50 0 0 0 50,1
//
//
//
let target;
// // (target = document.getElementById('test')) && ReactDOM.render(<MarkerSVG/> , target);
(target = document.getElementById('devices')) && ReactDOM.render(<Devices/> , target);
