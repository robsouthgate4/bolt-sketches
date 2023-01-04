import { flattenFloatArray } from "@/utils";
import {
  Mesh,
  Node,
  Program,
  GeometryBuffers,
  MeshParams,
} from "@bolt-webgl/core";
import Skin from "./Skin";

export default class SkinMesh extends Mesh {
  private _skin?: Skin | undefined;

  constructor(geometry?: GeometryBuffers, params?: MeshParams) {
    super(geometry, params);
    this.isSkinMesh = true;
  }

  draw(program: Program, node: Node) {
    if (!this._skin || !node) return;

    this._skin.update(node!);

    // activate program and pass joint data to program
    program.activate();
    //program.setTexture("jointTexture", this._skin.jointTexture);

    program.setMatrix4(
      "jointTransforms",
      flattenFloatArray(this.skin.jointMatrices)
    );

    program.setFloat("jointCount", this._skin.joints.length);

    super.draw(program);
  }

  public get skin(): Skin | undefined {
    return this._skin;
  }

  public set skin(value: Skin | undefined) {
    this._skin = value;
  }
}