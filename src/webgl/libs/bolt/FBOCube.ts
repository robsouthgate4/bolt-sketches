
import Bolt from "./Bolt";
import { CLAMP_TO_EDGE, COLOR_ATTACHMENT0, FRAMEBUFFER, LINEAR, TEXTURE_CUBE_MAP_POSITIVE_X } from "./Constants";
import TextureCube from "./TextureCube";

export default class FBOCube {

	private _width = 256;
	private _height = 256;
	private _targetTexture: TextureCube;
	private _frameBuffer: WebGLFramebuffer;
	private _gl: WebGL2RenderingContext;

	constructor( {
		width = 256,
		height = 256,
	} = {} ) {

		this._gl = Bolt.getInstance().getContext();
		this._targetTexture = new TextureCube( {
			width,
			height,
			generateMipmaps: true,
			minFilter: LINEAR,
			magFilter: LINEAR,
			flipY: false,
			wrapS: CLAMP_TO_EDGE,
			wrapT: CLAMP_TO_EDGE,
		} );
		this._targetTexture.bind();

		this._frameBuffer = <WebGLFramebuffer> this._gl.createFramebuffer();

		this.bind();

		for ( var side = 0; side < 6; side ++ ) {

			this._gl.framebufferTexture2D(
				FRAMEBUFFER,
				COLOR_ATTACHMENT0,
				TEXTURE_CUBE_MAP_POSITIVE_X + side,
				this._targetTexture.texture,
				0
			);

		}

		this.unbind();

	}

	setActiveSide( side: number ) {

		this._gl.framebufferTexture2D(
			FRAMEBUFFER,
			COLOR_ATTACHMENT0,
			TEXTURE_CUBE_MAP_POSITIVE_X + side,
			this._targetTexture.texture,
			0
		);

	}

	bind() {

		this._gl.bindFramebuffer( FRAMEBUFFER, this._frameBuffer );

	}

	unbind() {

		this._gl.bindFramebuffer( FRAMEBUFFER, null );

	}

	public get width() {

		return this._width;

	}
	public set width( value ) {

		this._width = value;

	}
	public get height() {

		return this._height;

	}
	public set height( value ) {

		this._height = value;

	}
	public get targetTexture(): TextureCube {

		return this._targetTexture;

	}

	public get frameBuffer(): WebGLFramebuffer {

		return this._frameBuffer;

	}

}
