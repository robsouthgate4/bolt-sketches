
import { CLAMP_TO_EDGE, LINEAR, RGBA, TEXTURE_MAG_FILTER, TEXTURE_MIN_FILTER, TEXTURE_WRAP_S, TEXTURE_WRAP_T, UNSIGNED_BYTE, TEXTURE_3D, TEXTURE_BASE_LEVEL, TEXTURE_MAX_LEVEL } from "../../libs/bolt";
import { Texture } from "../../libs/bolt";

export default class Texture3D extends Texture {

	private _depth: number;
	private _baseLevel: number;
	private _maxLevel: number;

	constructor(
		{
			imagePath = "",
			wrapS = CLAMP_TO_EDGE,
			wrapT = CLAMP_TO_EDGE,
			width = 256,
			height = 256,
			depth = 256,
			depthAttachment = false,
			minFilter = LINEAR,
			magFilter = LINEAR,
			format = RGBA,
			internalFormat = RGBA,
			type = UNSIGNED_BYTE,
			generateMipmaps = true,
			flipY = false,
			target = TEXTURE_3D,
			baseLevel = 0,
			maxLevel = 0,
		} = {}
	) {

		super({
			imagePath,
			wrapS,
			wrapT,
			width,
			height,
			depthAttachment,
			minFilter,
			magFilter,
			format,
			internalFormat,
			type,
			generateMipmaps,
			flipY,
			target,
		});

		this._depth = depth;
		this._baseLevel = baseLevel;
		this._maxLevel = maxLevel;

		this._init();

	}

	_init() {

		this._texture = <WebGLTexture>this._gl.createTexture();
		this.bind();

		this._gl.texImage3D(
			this.target,
			0,
			this._internalFormat,
			this._width,
			this._height,
			this._depth,
			0,
			this._format,
			this._type,
			null
		);

		this._applySettings();

	}


	resize(width: number, height: number, depth: number) {

		this.bind();

		this._gl.texImage3D(
			this.target,
			0,
			this._format,
			width,
			height,
			depth,
			0,
			this._format,
			this._type,
			null
		);

		this.unbind();

	}

	setFromData(data: Float32Array | Uint16Array | Uint8Array, width: number, height: number, depth: number) {

		this.bind();

		this._gl.texImage3D(this.target, 0, this._internalFormat, width, height, depth, 0,
			this._format, this._type, data);

		this.unbind();

	}

	_applySettings() {

		this.bind();

		if (this._flipY) {

			this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, this._flipY);

		}

		this._gl.texParameteri(
			this._target,
			TEXTURE_WRAP_S,
			this._wrapS
		);

		this._gl.texParameteri(
			this._target,
			TEXTURE_WRAP_T,
			this._wrapT
		);

		this._gl.texParameteri(
			this._target,
			TEXTURE_MIN_FILTER,
			this._minFilter
		);

		this._gl.texParameteri(
			this._target,
			TEXTURE_MAG_FILTER,
			this._magFilter
		);

		this._gl.texParameteri(
			this._target,
			TEXTURE_BASE_LEVEL,
			this._baseLevel
		);

		this._gl.texParameteri(
			this._target,
			TEXTURE_MAX_LEVEL,
			this._maxLevel
		);

		if (this._generateMipmaps) {

			this._gl.generateMipmap(this._target);

		}

		this.unbind();

	}

}
