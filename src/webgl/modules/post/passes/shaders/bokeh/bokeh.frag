#version 300 es

precision highp float;

uniform sampler2D map;
uniform sampler2D mapDepth;
uniform vec2 resolution;

uniform vec4 dofParams;
uniform vec4 vignetteParams;
uniform vec2 cameraPlanes;
uniform float CoC;
uniform bool autofocus;

uniform vec2 focus;
uniform float maxblur;

uniform float threshold;
uniform float gain;

uniform float bias;
uniform float fringe;

uniform bool noise;
uniform float namount;

uniform bool depthblur;
uniform float dbsize;

uniform float focalDepth;
uniform float focalLength;
uniform float fstop;
uniform bool showFocus;
uniform bool manualdof;

uniform int rings;
uniform int samples;

in vec2 Uv;

out vec4 FragColor;

/*
DoF with bokeh GLSL;.4
by Martins Upitis (martinsh) (devlog-martinsh.blogspot.com)
*/

#define PI  3.14159265

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
	dist = smoothstep(vignetteParams.y+(fstop/vignetteParams.z), vignetteParams.z+(fstop/vignetteParams.z), dist);
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
		float b = (a-dofParams.z)/dofParams.w; //far DoF
		float c = (-a-dofParams.x)/dofParams.y; //near Dof
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

	if (vignetteParams.x == 1.0)
	{
		col *= vignette();
	}

    FragColor = vec4( col, 1.0);

}