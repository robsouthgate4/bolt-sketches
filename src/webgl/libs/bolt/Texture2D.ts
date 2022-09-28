

import { CLAMP_TO_EDGE, LINEAR, RGBA, TEXTURE_2D, TEXTURE_MAG_FILTER, TEXTURE_MIN_FILTER, TEXTURE_WRAP_S, TEXTURE_WRAP_T, UNSIGNED_BYTE } from "./Constants";
import Texture from "./Texture";

export default class Texture2D extends Texture {

	constructor(
		{
			imagePath = "",
			wrapS = CLAMP_TO_EDGE,
			wrapT = CLAMP_TO_EDGE,
			width = 256,
			height = 256,
			depthAttachment = false,
			minFilter = LINEAR,
			magFilter = LINEAR,
			format = RGBA,
			internalFormat = RGBA,
			type = UNSIGNED_BYTE,
			generateMipmaps = true,
			flipY = false,
			target = TEXTURE_2D,
		} = {}
	) {

		super( {
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
		} );

		this._init();

	}

	_init() {

		this._texture = <WebGLTexture> this._gl.createTexture();
		this._gl.bindTexture( this.target, this._texture );

		this._gl.texImage2D(
			TEXTURE_2D,
			0,
			this._internalFormat,
			this._width,
			this._height,
			0,
			this._format,
			this._type,
			null
		);

		this._applySettings();

	}

	resize( width: number, height: number ) {

		this.bind();

		this._gl.texImage2D(
			TEXTURE_2D,
			0,
			this._internalFormat,
			width,
			height,
			0,
			this._format,
			this._type,
			null
		);

		this.unbind();

	}

	setFromData( data: Float32Array | Uint16Array | Uint8Array, width: number, height: number ) {

		this.bind();

		this._gl.texImage2D( this._gl.TEXTURE_2D, 0, this._internalFormat, width, height, 0,
			this._format, this._type, data );

		this.unbind();

	}

	_applySettings() {

		this.bind();

		if ( this._flipY ) {

			this._gl.pixelStorei( this._gl.UNPACK_FLIP_Y_WEBGL, this._flipY );

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

		if ( this._generateMipmaps ) {

			this._gl.generateMipmap( this._target );

		}


		this.unbind();

	}

	load() {

		// eslint-disable-next-line compat/compat
		return new Promise( ( resolve, reject ) => {

			const image = new Image();

			image.addEventListener( "load", () => {

				this.bind();

				this._gl.texImage2D(
					TEXTURE_2D,
					0,
					this._format,
					this._format,
					this._pixelType,
					image
				);


				this._width = image.width;
				this._height = image.height;

				this._applySettings();

				resolve( image );

			} );

			image.addEventListener( "error", ( ev ) => {

				reject( ev );

			} );

			image.src = this._imagePath;

		} );

	}

}
