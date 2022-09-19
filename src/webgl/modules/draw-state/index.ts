import Bolt, { FBO, Mesh, Program, TextureCube, Texture2D, Viewport, DrawSet, VBO, AttribPointer, TypedArray } from "@bolt-webgl/core";
import { mat2, mat3, mat4, vec2, vec3, vec4 } from "gl-matrix";

export default class DrawState {

	private _bolt: Bolt;
	private _viewport: Viewport = { offsetX: 0, offsetY: 0, width: 0, height: 0 };
	private _fbo?: FBO;
	private _drawSet?: DrawSet;

	protected _instanceCount!: number;
	private _clearColor!: { r: number; g: number; b: number; a: number; };

	constructor(bolt: Bolt) {

		this._bolt = bolt;

	}

	drawSet(drawSet: DrawSet) {

		this._drawSet = drawSet;

		return this;

	}

	uniformVector2(uniform: string, value: vec2) {

		this._drawSet && this._drawSet.program.setVector2(uniform, value);

		return this;

	}

	uniformVector3(uniform: string, value: vec3) {

		this._drawSet && this._drawSet.program.setVector3(uniform, value);

		return this;

	}

	uniformVector4(uniform: string, value: vec4) {

		this._drawSet && this._drawSet.program.setVector4(uniform, value);

		return this;

	}

	uniformMatrix3(uniform: string, value: mat3) {

		this._drawSet && this._drawSet.program.setMatrix3(uniform, value);

		return this;

	}

	uniformMatrix4(uniform: string, value: mat4) {

		this._drawSet && this._drawSet.program.setMatrix4(uniform, value);

		return this;

	}

	uniformInt(uniform: string, value: number) {

		this._drawSet && this._drawSet.program.setInt(uniform, value);

		return this;

	}

	uniformBoolean(uniform: string, value: number) {

		this._drawSet && this._drawSet.program.setBool(uniform, value);

		return this;

	}

	uniformTexture(uniform: string, texture: TextureCube | Texture2D) {

		this._drawSet && this._drawSet.program.setTexture(uniform, texture);

		return this;

	}

	attribute(buffer: TypedArray, size: number, layoutID: number | AttribPointer, type: number, offset: number, divisor: number) {

		if(this._drawSet) {

			this._drawSet.mesh.setAttribute(buffer, size, layoutID, type, offset, divisor);

		} else {

			console.error("No draw set provided");

		}

		return this;

	}

	instanceCount(count: number) {

		this._instanceCount = count;

		return this;

	}


	vbo(vbo: VBO, size: number, layoutID: number | AttribPointer, type: number, offset: number, stride: number) {

		if(this._drawSet) {

			this._drawSet.mesh.setVBO(vbo, size, layoutID, type, offset, stride);

		}else {

			console.error("No draw set provided");

		}

		return this;

	}

	fbo(fbo: FBO) {

		this._fbo = fbo;

		return this;

	}

	clear(r: number, g: number, b: number, a: number) {

		this._clearColor = { r, g, b, a };

		return this;

	}

	viewport(offsetX: number, offsetY: number, width: number, height: number) {

		this._viewport = { offsetX, offsetY, width, height };

		return this;

	}

	draw() {

		if(this._fbo) {

			this._fbo.bind();

		}

		this._viewport && this._bolt.setViewPort(this._viewport.offsetX, this._viewport.offsetY, this._viewport.width, this._viewport.height);

		this._clearColor && this._bolt.clear(this._clearColor.r, this._clearColor.g, this._clearColor.b, this._clearColor.a);

		if(this._drawSet) {

			this._bolt.draw(this._drawSet);

		}

		if(this._fbo) {

			this._fbo.unbind();

		}

	}

}