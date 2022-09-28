#version 300 es

precision highp float;

//uniform sampler2D diffuse;

uniform vec3 objectColor;
uniform vec3 lightColor;
uniform float time;
uniform vec2 resolution;

out vec4 FragColor;

in vec3 Normal;
in vec3 MixedColor;
in vec2 Uv;
in float NoiseOne;
in float NoiseTwo;
in float NoiseThree;
in float M;

vec2 hash( vec2 p )
{
	p = vec2( dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)) );
	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float noise( in vec2 p )
{
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;

	vec2  i = floor( p + (p.x+p.y)*K1 );
    vec2  a = p - i + (i.x+i.y)*K2;
    float m = step(a.y,a.x);
    vec2  o = vec2(m,1.0-m);
    vec2  b = a - o + K2;
	vec2  c = a - 1.0 + 2.0*K2;
    vec3  h = max( 0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );
	vec3  n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
    return dot( n, vec3(70.0) );
}

void main() {

    vec2 uv = gl_FragCoord.xy / resolution.xy;
    uv -= 0.5;
    uv.x *= resolution.x / resolution.y;

    float n = noise( uv * 280. ) * 0.5 + 0.5;

	FragColor = vec4( mix( MixedColor, MixedColor * 0.9, n ), 1.0);

	//FragColor = vec4( MixedColor, 1.0 );

}