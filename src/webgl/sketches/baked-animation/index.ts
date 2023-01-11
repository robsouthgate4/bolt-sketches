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
  Plane,
  Texture2D,
  RGBA32f,
  RGBA,
  FLOAT,
  NEAREST,
  LINEAR,
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
  private _joints: any[];
  private _cubeDS: DrawSet;
  private root: Node;
  private _testJoint: Node;
  private _quad: DrawSet;
  private _texture: Texture2D;
  private _quad2: DrawSet;
  private _texture2: Texture2D;
  private _texture3: Texture2D;

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
      position: vec3.fromValues(0, 1, 5),
      target: vec3.fromValues(0, 0.5, 0),
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
  // construct the sketch§
  async initSketch() {
    this.gtlfLoader = new GLTFLoader(this.bolt, false);

    this.floor = new Floor(10);

    this.glb = await this.gtlfLoader.load(
      "/static/models/gltf/examples/character/running-man2.glb"
    );

    this._joints = [];

    this._texture = new Texture2D({
      width: 1,
      height: 1,
      internalFormat: RGBA32f,
      format: RGBA,
      type: FLOAT,
      minFilter: NEAREST,
      magFilter: NEAREST,
      generateMipmaps: false,
      flipY: false,
    });

    this._texture.setFromData(new Float32Array([0, 1, 0, 1]), 1, 1);

    this._texture2 = new Texture2D({
      width: 1,
      height: 1,
      format: RGBA,
      minFilter: NEAREST,
      magFilter: NEAREST,
      generateMipmaps: false,
      flipY: false,
    });

    this._texture2.minFilter = LINEAR;
    this._texture2.magFilter = LINEAR;

    this._texture2.setFromData(new Uint8Array([255, 0, 0, 255]), 1, 1);

    this.root = new Node();
    this.glb.setParent(this.root);

    const cubeGeo = new Cube();
    const cubeProg = new Program(vertexShader, fragmentShader);
    const cubeProg2 = new Program(vertexShader, fragmentShader);

    this._cubeDS = new DrawSet(new Mesh(cubeGeo), cubeProg);
    this._cubeDS.transform.scale = vec3.fromValues(0.2, 0.2, 0.2);

    this.glb.traverse((node: Node) => {
      if (node.isJoint) {
        if (node.name === "mixamorig:LeftUpLeg") {
          console.log(node);
          this._testJoint = node;
        }
      }
    });

    const gltfAnimations = this.gtlfLoader.animations;

    this._characterAnimation = new BakedAnimation(gltfAnimations);
    this._characterAnimation.runAnimation("Armature|mixamo.com|Layer0");

    this._quad = new DrawSet(new Mesh(new Plane()), cubeProg);
    this._quad.transform.scale = vec3.fromValues(1, 1, 1);
    this._quad.transform.position = vec3.fromValues(1, 0.5, 0);

    this._quad.program.activate();
    this._quad.program.setTexture("testTexture", this._texture);
    this._quad.program.setTexture("testTexture2", this._texture2);

    this._quad2 = new DrawSet(new Mesh(new Plane()), cubeProg2);
    this._quad2.transform.scale = vec3.fromValues(1, 1, 1);
    this._quad2.transform.position = vec3.fromValues(-1, 0.5, 0);

    this._quad2.program.activate();
    this._quad2.program.setTexture("testTexture", this._texture2);
    this._quad2.program.setTexture("testTexture2", this._texture);

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

    this._texture.setFromData(new Float32Array([0, 1, 0, 0]), 1, 1);
    this._texture2.setFromData(new Uint8Array([255, 255, 0, 255]), 1, 1);

    const worldMatrix = this._testJoint.modelMatrix;

    const pos = mat4.getTranslation(vec3.create(), worldMatrix);
    const rot = mat4.getRotation(quat.create(), worldMatrix);

    this._cubeDS.transform.position = vec3.add(
      vec3.create(),
      pos,
      vec3.fromValues(0, 0, 0)
    );

    this._cubeDS.transform.quaternion = rot;

    //this.bolt.draw(this.floor);
    this.bolt.draw(this.root);
    // this.bolt.draw(this._quad);
    // this.bolt.draw(this._quad2);
    // this.bolt.draw(this._cubeDS);
  }

  lateUpdate(elapsed: number, delta: number) {
    return;
  }
}
