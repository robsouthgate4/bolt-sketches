import Base from "@webgl/Base";
import {
  Bolt,
  CameraPersp,
  Program,
  Node,
  Orbit,
  EventListeners,
  DrawSet,
  Cube,
  Mesh,
} from "@bolt-webgl/core";

import { mat4, quat, vec3 } from "gl-matrix";
import config from "./config";

import GLTFLoader from "./libs/gltf-loader";

import BakedAnimation from "./libs/baked-animation";
import Floor from "@/webgl/drawSets/floor";

import vertexShader from "./programs/normal/shaders/vertexShader.glsl";
import fragmentShader from "./programs/normal/shaders/fragmentShader.glsl";
import SkinMesh from "./libs/gltf-loader/SkinMesh";

export default class extends Base {
  canvas: HTMLCanvasElement;
  camera: CameraPersp;
  assetsLoaded!: boolean;
  bolt: Bolt;
  orbit: Orbit;
  config: any;
  eventListeners = EventListeners.getInstance();
  gtlfLoader: GLTFLoader;
  debugProgram: Program;
  glb: Node;

  private _characterAnimation: BakedAnimation;
  private floor: Floor;
  private nodes: any[];
  private _cubeDS: DrawSet;
  private root: Node;
  private _neckJoint: Node;

  constructor() {
    super();

    this.config = config;

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas = <HTMLCanvasElement>document.getElementById("experience");
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.eventListeners.setBoundElement(this.canvas);

    this.bolt = Bolt.getInstance();
    this.bolt.init(this.canvas, {
      antialias: true,
      dpi: Math.min(1, window.devicePixelRatio),
      powerPreference: "high-performance",
    });

    this.camera = new CameraPersp({
      aspect: this.canvas.width / this.canvas.height,
      fov: 45,
      near: 0.1,
      far: 1000,
      position: vec3.fromValues(0, 15, 30),
      target: vec3.fromValues(0, 15, 0),
    });

    this.orbit = new Orbit(this.camera, {
      zoomSpeed: 3,
      maxRadius: 300,
    });

    this.bolt.setViewPort(0, 0, this.canvas.width, this.canvas.height);
    this.bolt.setCamera(this.camera);
    this.bolt.enableDepth();

    this.initSketch();
    this.resize();
  }
  // construct the sketch
  async initSketch() {
    this.gtlfLoader = new GLTFLoader(this.bolt, false);

    this.floor = new Floor(100);

    this.glb = await this.gtlfLoader.load(
      "/static/models/gltf/examples/character/running-man.glb"
    );

    console.log(this.glb);

    this.nodes = [];

    this.root = new Node();

    this.glb.setParent(this.root);

    this.root.transform.scale = vec3.fromValues(1, 1, 1);

    const cubeGeo = new Cube();
    const cubeProg = new Program(vertexShader, fragmentShader);

    this._cubeDS = new DrawSet(new Mesh(cubeGeo), cubeProg);
    this._cubeDS.transform.scale = vec3.fromValues(2, 2, 2);

    this.glb.traverse((node: Node) => {
      if (node.name && node.name.includes("Leg")) {
        this._neckJoint = node;
      }
    });

    const gltfAnimations = this.gtlfLoader.animations;

    this._characterAnimation = new BakedAnimation(gltfAnimations);

    this.assetsLoaded = true;
  }

  resize() {
    this.bolt.resizeCanvasToDisplay();
    this.camera.updateProjection(window.innerWidth / window.innerHeight);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  earlyUpdate(elapsed: number, delta: number) {
    return;
  }

  update(elapsed: number, delta: number) {
    if (!this.assetsLoaded) return;

    this.orbit.update();
    this.bolt.setViewPort(0, 0, this.canvas.width, this.canvas.height);
    this.bolt.clear(0, 0, 0, 1);

    this._characterAnimation.update(elapsed, delta);

    //this.glb.updateModelMatrix();

    const worldMatrix = this._neckJoint.modelMatrix;

    const pos = mat4.getTranslation(vec3.create(), worldMatrix);
    const rot = mat4.getRotation(quat.create(), worldMatrix);

    this._cubeDS.transform.position = pos;
    this._cubeDS.transform.quaternion = rot;

    this.bolt.draw(this._cubeDS);
    this.bolt.draw(this.root);
    this.bolt.draw(this.floor);
  }

  lateUpdate(elapsed: number, delta: number) {
    return;
  }
}
