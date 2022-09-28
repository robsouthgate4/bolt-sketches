
import Bolt from "./Bolt";
import { COLOR_ATTACHMENT0, DEPTH_ATTACHMENT, DEPTH_COMPONENT32F, DEPTH_COMPONENT, FRAMEBUFFER, TEXTURE_2D, UNSIGNED_INT, NEAREST, FLOAT, CLAMP_TO_EDGE } from "./Constants";
import Texture2D from "./Texture2D";

export default class FBO {

	private _width = 256;
	private _height = 256;
	private _targetTexture: Texture2D;
	private _frameBuffer: WebGLFramebuffer;
	private _gl: WebGL2RenderingContext;
	private _depthTexture?: Texture2D;
	private _attachmentIds!: number[];
	private _attachmentTextures!: Texture2D[];
	private _bolt: Bolt;
	private _depth: boolean;

	constructor( {
		width = 256,
		height = 256,
		depth = false,
	} = {} ) {

		this._depth = depth;
		this._bolt = Bolt.getInstance();
		this._gl = this._bolt.getContext();

		this._width = width;
		this._height = height;

		this._targetTexture = new Texture2D( { width, height, generateMipmaps: false } );
		this._frameBuffer = <WebGLFramebuffer> this._gl.createFramebuffer();

		this.bind();

		this._gl.framebufferTexture2D(
			FRAMEBUFFER,
			COLOR_ATTACHMENT0,
			TEXTURE_2D,
			this._targetTexture.texture,
			0
		);

		this._attachmentIds = [ COLOR_ATTACHMENT0 ];
		this._attachmentTextures = [];

		/**
		 * Attach depth buffer and setup texture if depth is true
		 */
		if ( depth ) {

			this._depthTexture = new Texture2D( {
				width,
				height,
				generateMipmaps: false,
				internalFormat: DEPTH_COMPONENT32F,
				format: DEPTH_COMPONENT,
				type: FLOAT,
				minFilter: NEAREST,
				magFilter: NEAREST,
				wrapS: CLAMP_TO_EDGE,
				wrapT: CLAMP_TO_EDGE,
			} );

			this._depthTexture.bind();

			this._gl.framebufferTexture2D(
				FRAMEBUFFER,
				DEPTH_ATTACHMENT,
				TEXTURE_2D,
				this._depthTexture.texture,
				0
			);

		}


		this.unbind();

	}
	/**
	 * Add an attachment to the framebuffer ( multi render targets )
	 * @param  {Texture2D} texture
	 * @param  {number} id
	 */
	addAttachment( texture: Texture2D, id: number ) {

		texture.bind();
		this._gl.bindFramebuffer( FRAMEBUFFER, this._frameBuffer );
		this._gl.framebufferTexture2D( FRAMEBUFFER, id, TEXTURE_2D, texture.texture, 0 );
		texture.unbind();

		this._attachmentIds.push( id );
		this._attachmentTextures.push( texture );


	}
	/**
	 * Set draw buffers for the framebuffer
	 */
	setDrawBuffers() {

		this._gl.drawBuffers( this._attachmentIds );

	}
	/**
	 * resize the framebuffer and all attachments
	 * @param  {number} width width of the framebuffer
	 * @param  {number} height height of the framebuffer
	 */
	resize( width: number, height: number ) {

		this._targetTexture.resize( width, height );

		this._width = width;
		this._height = height;

		if ( this._depth && this._depthTexture ) {

			this._depthTexture.resize( width, height );

		}

		this._attachmentTextures.forEach( ( attachment: Texture2D ) => {

			attachment.resize( width, height );

		} );

	}
	/**
	 * @param  {} updateViewPort=true if true, update the viewport to the size of the framebuffer
	 */
	bind( updateViewPort = true ) {

		// set viewport size to match fbo size
		if ( updateViewPort ) this._bolt.setViewPort( 0, 0, this._width, this._height );

		this._gl.bindFramebuffer( FRAMEBUFFER, this._frameBuffer );

	}

	unbind( updateViewPort = true ) {

		// reset viewport size
		if ( updateViewPort ) this._bolt.setViewPort( 0, 0, this._gl.canvas.width, this._gl.canvas.height );

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

	public get targetTexture(): Texture2D {

		return this._targetTexture;

	}

	public get frameBuffer(): WebGLFramebuffer {

		return this._frameBuffer;

	}

	public get attachments(): number[] {

		return this._attachmentIds;

	}

	public set attachments( value: number[] ) {

		this._attachmentIds = value;

	}

	public get depthTexture(): Texture2D | undefined {

		return this._depthTexture || undefined;

	}

}
