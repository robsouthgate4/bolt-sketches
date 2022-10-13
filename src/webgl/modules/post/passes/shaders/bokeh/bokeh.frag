#version 300 es

precision highp float;

uniform sampler2D map;
uniform sampler2D mapDepth;
uniform vec2 resolution;

uniform vec2 cameraPlanes;

in vec2 Uv;

out vec4 FragColor;

/*
DoF with bokeh GLSL shader v2.4
by Martins Upitis (martinsh) (devlog-martinsh.blogspot.com)

----------------------
The shader is Blender Game Engine ready, but it should be quite simple to adapt for your engine.

This work is licensed under a Creative Commons Attribution 3.0 Unported License.
So you are free to share, modify and adapt it for your needs, and even use it for commercial use.
I would also love to hear about a project you are using it.

Have fun,
Martins
----------------------

changelog:

2.4:
- physically accurate DoF simulation calculated from "focalDepth" ,"focalLength", "f-stop" and "CoC" parameters.
- option for artist controlled DoF simulation calculated only from "focalDepth" and individual controls for near and far blur
- added "circe of confusion" (CoC) parameter in mm to accurately simulate DoF with different camera sensor or film sizes
- cleaned up the code
- some optimization

2.3:
- new and physically little more accurate DoF
- two extra input variables - focal length and aperture iris diameter
- added a debug visualization of focus point and focal range

2.1:
- added an option for pentagonal bokeh shape
- minor fixes

2.0:
- variable sample count to increase quality/performance
- option to blur depth buffer to reduce hard edges
- option to dither the samples with noise or pattern
- bokeh chromatic aberration/fringing
- bokeh bias to bring out bokeh edges
- image thresholding to bring out highlights when image is out of focus

*/

//uniform float mapresolution.x;
//uniform float mapresolution.y;

#define PI  3.14159265


//uniform variables from external script

/*
uniform float focalDepth;  //focal distance value in meters, but you may use autofocus option below
uniform float focalLength; //focal length in mm
uniform float fstop; //f-stop value
uniform bool showFocus; //show debug focus point and focal range (red = focal point, green = focal range)
*/
const float focalDepth = 1.0;
const float focalLength = 12.0;
const float fstop = 2.0;
const bool showFocus = false;

/*
make sure that these two values are the same for your camera, otherwise distances will be wrong.
*/


//------------------------------------------
//user variables

const int samples = 4; //samples on the first ring
const int rings = 3; //ring count

const bool manualdof = true; //manual dof calculation
const float ndofstart = 1.0; //near dof blur start
const float ndofdist = 2.0; //near dof blur falloff distance
const float fdofstart = 1.5; //far dof blur start
const float fdofdist = 1.5; //far dof blur falloff distance

const float CoC = 0.03;//circle of confusion size in mm (35mm film = 0.03mm)

const bool vignetting = false; //use optical lens vignetting?
const float vignout = 1.3; //vignetting outer border
const float vignin = 0.0; //vignetting inner border
const float vignfade = 22.0; //f-stops till vignete fades

const bool autofocus = false; //use autofocus in shader? disable if you use external focalDepth value
const vec2 focus = vec2(0.5,0.5); // autofocus point on screen (0.0,0.0 - left lower corner, 1.0,1.0 - upper right)
const float maxblur = 1.0; //clamp value of max blur (0.0 = no blur,1.0 default)

const float threshold = 0.7; //highlight threshold;
const float gain = 100.0; //highlight gain;

const float bias = 0.5; //bokeh edge bias
const float fringe = 0.7; //bokeh chromatic aberration/fringing

const bool noise = false; //use noise instead of pattern for sample dithering
const float namount = 0.0001; //dither amount

const bool depthblur = true; //blur the depth buffer?
const float dbsize = 2.5; //depthblursize

/*
next part is experimental
not looking good with small sample and ring count
looks okay starting from samples = 4, rings = 4
*/

const bool pentagon = false; //use pentagon as bokeh shape?
const float feather = 0.4; //pentagon shape feather

//------------------------------------------


float penta(vec2 coords) //pentagonal shape
{
	float scale = float(rings) - 1.3;
	vec4  HS0 = vec4( 1.0,         0.0,         0.0,  1.0);
	vec4  HS1 = vec4( 0.309016994, 0.951056516, 0.0,  1.0);
	vec4  HS2 = vec4(-0.809016994, 0.587785252, 0.0,  1.0);
	vec4  HS3 = vec4(-0.809016994,-0.587785252, 0.0,  1.0);
	vec4  HS4 = vec4( 0.309016994,-0.951056516, 0.0,  1.0);
	vec4  HS5 = vec4( 0.0        ,0.0         , 1.0,  1.0);

	vec4  one = vec4( 1.0 );

	vec4 P = vec4((coords),vec2(scale, scale));

	vec4 dist = vec4(0.0);
	float inorout = -4.0;

	dist.x = dot( P, HS0 );
	dist.y = dot( P, HS1 );
	dist.z = dot( P, HS2 );
	dist.w = dot( P, HS3 );

	dist = smoothstep( -feather, feather, dist );

	inorout += dot( dist, one );

	dist.x = dot( P, HS4 );
	dist.y = HS5.w - abs( P.z );

	dist = smoothstep( -feather, feather, dist );
	inorout += dist.x;

	return clamp( inorout, 0.0, 1.0 );
}

float bdepth(vec2 coords) //blurring depth
{

    vec2 texel = vec2(1.0/resolution.x,1.0/resolution.y);

	float d = 0.0;
	float kernel[9];
	vec2 offset[9];

	vec2 wh = vec2(texel.x, texel.y) * dbsize;

	offset[0] = vec2(-wh.x,-wh.y);
	offset[1] = vec2( 0.0, -wh.y);
	offset[2] = vec2( wh.x -wh.y);

	offset[3] = vec2(-wh.x,  0.0);
	offset[4] = vec2( 0.0,   0.0);
	offset[5] = vec2( wh.x,  0.0);

	offset[6] = vec2(-wh.x, wh.y);
	offset[7] = vec2( 0.0,  wh.y);
	offset[8] = vec2( wh.x, wh.y);

	kernel[0] = 1.0/16.0;   kernel[1] = 2.0/16.0;   kernel[2] = 1.0/16.0;
	kernel[3] = 2.0/16.0;   kernel[4] = 4.0/16.0;   kernel[5] = 2.0/16.0;
	kernel[6] = 1.0/16.0;   kernel[7] = 2.0/16.0;   kernel[8] = 1.0/16.0;


	for( int i=0; i<9; i++ )
	{
		float tmp = texture(mapDepth, coords + offset[i]).r;
		d += tmp * kernel[i];
	}

	return d;
}


vec3 color(vec2 coords,float blur) //processing the sample
{
	vec3 col = vec3(0.0);

    vec2 texel = vec2(1.0/resolution.x,1.0/resolution.y);

	col.r = texture(map,coords + vec2(0.0,1.0)*texel*fringe*blur).r;
	col.g = texture(map,coords + vec2(-0.866,-0.5)*texel*fringe*blur).g;
	col.b = texture(map,coords + vec2(0.866,-0.5)*texel*fringe*blur).b;

	vec3 lumcoeff = vec3(0.299,0.587,0.114);
	float lum = dot(col.rgb, lumcoeff);
	float thresh = max((lum-threshold)*gain, 0.0);
	return col+mix(vec3(0.0),col,thresh*blur);
}

vec2 rand(vec2 coord) //generating noise/pattern texture for dithering
{
	float noiseX = ((fract(1.0-coord.s*(resolution.x/2.0))*0.25)+(fract(coord.t*(resolution.y/2.0))*0.75))*2.0-1.0;
	float noiseY = ((fract(1.0-coord.s*(resolution.x/2.0))*0.75)+(fract(coord.t*(resolution.y/2.0))*0.25))*2.0-1.0;

	if (noise)
	{
		noiseX = clamp(fract(sin(dot(coord ,vec2(12.9898,78.233))) * 43758.5453),0.0,1.0)*2.0-1.0;
		noiseY = clamp(fract(sin(dot(coord ,vec2(12.9898,78.233)*2.0)) * 43758.5453),0.0,1.0)*2.0-1.0;
	}
	return vec2(noiseX,noiseY);
}

vec3 debugFocus(vec3 col, float blur, float depth)
{
	float edge = 0.002*depth; //distance based edge smoothing
	float m = clamp(smoothstep(0.0,edge,blur),0.0,1.0);
	float e = clamp(smoothstep(1.0-edge,1.0,blur),0.0,1.0);

	col = mix(col,vec3(1.0,0.5,0.0),(1.0-m)*0.6);
	col = mix(col,vec3(0.0,0.5,1.0),((1.0-e)-(1.0-m))*0.2);

	return col;
}

float linearize(float depth)
{
	return -cameraPlanes.y * cameraPlanes.x / (depth * (cameraPlanes.y - cameraPlanes.x) - cameraPlanes.y);
}

float vignette()
{
	float dist = distance(Uv, vec2(0.5,0.5));
	dist = smoothstep(vignout+(fstop/vignfade), vignin+(fstop/vignfade), dist);
	return clamp(dist,0.0,1.0);
}

void main() {

    //scene depth calculation

	float depth = linearize(texture(mapDepth,Uv.xy).x);

	if (depthblur)
	{
		depth = linearize(bdepth(Uv.xy));
	}

	//focal plane calculation

	float fDepth = focalDepth;

	if (autofocus)
	{
		fDepth = linearize(texture(mapDepth,focus).x);
	}

	//dof blur factor calculation

	float blur = 0.0;

	if (manualdof)
	{
		float a = depth-fDepth; //focal plane
		float b = (a-fdofstart)/fdofdist; //far DoF
		float c = (-a-ndofstart)/ndofdist; //near Dof
		blur = (a>0.0)?b:c;
	}

	else
	{
		float f = focalLength; //focal length in mm
		float d = fDepth*1000.0; //focal plane in mm
		float o = depth*1000.0; //depth in mm

		float a = (o*f)/(o-f);
		float b = (d*f)/(d-f);
		float c = (d-f)/(d*fstop*CoC);

		blur = abs(a-b)*c;
	}

	blur = clamp(blur,0.0,1.0);

	// calculation of pattern for ditering

	vec2 noise = rand(Uv.xy)*namount*blur;

	// getting blur x and y step factor

	float w = (1.0/resolution.x)*blur*maxblur+noise.x;
	float h = (1.0/resolution.y)*blur*maxblur+noise.y;

	// calculation of final color

	vec3 col = vec3(0.0);

	if(blur < 0.05) //some optimization thingy
	{
		col = texture(map, Uv.xy).rgb;
	}

	else
	{
		col = texture(map, Uv.xy).rgb;
		float s = 1.0;
		int ringsamples;

		for (int i = 1; i <= rings; i += 1)
		{
			ringsamples = i * samples;

			for (int j = 0 ; j < ringsamples ; j += 1)
			{
				float step = PI*2.0 / float(ringsamples);
				float pw = (cos(float(j)*step)*float(i));
				float ph = (sin(float(j)*step)*float(i));
				float p = 1.0;
				if (pentagon)
				{
					p = penta(vec2(pw,ph));
				}
				col += color(Uv.xy + vec2(pw*w,ph*h),blur)*mix(1.0,(float(i))/(float(rings)),bias)*p;
				s += 1.0*mix(1.0,(float(i))/(float(rings)),bias)*p;
			}
		}
		col /= s; //divide by sample count
	}

	if (showFocus)
	{
		col = debugFocus(col, blur, depth);
	}

	if (vignetting)
	{
		col *= vignette();
	}

    FragColor = vec4( col, 1.0);

}