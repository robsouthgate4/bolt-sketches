import Base from "@webgl/Base";
import {
  Bolt,
  CameraPersp,
  Program,
  Node,
  Orbit,
  EventListeners,
} from "@bolt-webgl/core";

import { quat, vec3 } from "gl-matrix";
import config from "./config";

import GLTFLoader from "./libs/gltf-loader";

import BakedAnimation from "./libs/baked-animation";
import Floor from "@/webgl/drawSets/floor";

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
  floor: Floor;

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
      position: vec3.fromValues(0, 1, 15),
      target: vec3.fromValues(0, 6, 0),
    });

    this.orbit = new Orbit(this.camera, {
      zoomSpeed: 0.5,
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
      "/static/models/gltf/examples/character/scene.glb"
    );

    //this.glb.transform.scale = vec3.fromValues(5, 5, 5);

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

    // draw scenery

    const q = quat.create();
    quat.rotateX(q, q, -0.6);

    this.glb.traverse((node) => {
      if (node.name === "Shoulder_R_Reference") {
        quat.multiply(node.transform.quaternion, q, node.transform.quaternion);
      }
    });

    this.bolt.setViewPort(0, 0, this.canvas.width, this.canvas.height);
    this.bolt.clear(0.7, 0.7, 0.7, 1);
    this.bolt.draw(this.floor);

    this._characterAnimation.update(elapsed, delta);
    this.bolt.draw(this.glb);
  }

  lateUpdate(elapsed: number, delta: number) {
    return;
  }
}
