import { Node, Texture2D } from "@bolt-webgl/core";
import { mat4, vec3 } from "gl-matrix";

export default class Skin {
  private _joints: Node[];
  private _inverseBindMatrices: Float32Array[];
  private _jointMatrices: Float32Array[];
  private _jointData: Float32Array;
  private _jointTexture: Texture2D;
  private _globalWorldInverse = mat4.create();
  private _scaleFactor = vec3.fromValues(1, 1, 1);
  private _position = vec3.fromValues(0, 0, 0);
  private _root = mat4.create();

  constructor(joints: Node[], inverseBindMatrixData: Float32Array) {
    this._joints = joints;
    this._inverseBindMatrices = [];
    this._jointMatrices = [];

    const mat4size = 4 * 4;
    this._jointData = new Float32Array(this._joints.length * mat4size);

    for (let i = 0; i < joints.length; i++) {
      this._inverseBindMatrices.push(
        new Float32Array(
          inverseBindMatrixData.buffer,
          inverseBindMatrixData.byteOffset +
            Float32Array.BYTES_PER_ELEMENT * mat4size * i,
          mat4size
        )
      );

      this._jointMatrices.push(
        new Float32Array(
          this._jointData.buffer,
          Float32Array.BYTES_PER_ELEMENT * mat4size * i,
          mat4size
        )
      );
    }

    // console.log(this._jointData);

    // this._jointTexture = new Texture2D({
    //   width: 4,
    //   height: this._joints.length,
    //   format: RGBA,
    //   internalFormat: RGBA32f,
    //   wrapS: CLAMP_TO_EDGE,
    //   wrapT: CLAMP_TO_EDGE,
    //   minFilter: NEAREST,
    //   magFilter: NEAREST,
    //   type: FLOAT,
    //   generateMipmaps: false,
    // });
  }

  setScale(scale: vec3) {
    this._scaleFactor = scale;
  }

  setPosition(position: vec3) {
    this._position = position;
  }

  update(node: Node) {
    const root = mat4.create();

    mat4.translate(root, root, this._position);
    mat4.scale(root, root, this._scaleFactor);
    mat4.invert(this._globalWorldInverse, node.modelMatrix);

    // apply inverse bind matrix to each joint

    for (let i = 0; i < this._joints.length; i++) {
      const joint = this._joints[i];

      const dst = this._jointMatrices[i];

      mat4.multiply(dst, this._globalWorldInverse, joint.modelMatrix);
      mat4.multiply(dst, dst, this._inverseBindMatrices[i]);
      mat4.multiply(dst, root, dst);
    }

    //this._jointTexture.setFromData(this._jointData, 4, this._joints.length);
  }

  public get jointTexture(): Texture2D {
    return this._jointTexture;
  }

  public set jointTexture(value: Texture2D) {
    this._jointTexture = value;
  }

  public get joints(): Node[] {
    return this._joints;
  }
  public set joints(value: Node[]) {
    this._joints = value;
  }
  public get jointMatrices(): Float32Array[] {
    return this._jointMatrices;
  }
  public set jointMatrices(value: Float32Array[]) {
    this._jointMatrices = value;
  }
}
