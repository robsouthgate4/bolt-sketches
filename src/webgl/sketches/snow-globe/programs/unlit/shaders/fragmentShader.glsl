#version 300 es

precision highp float;

in vec2 Uv;

layout(location = 0) out vec4 defaultColor;
layout(location = 1) out vec4 scene;
layout(location = 2) out vec4 normal;

uniform float multiplier;
uniform sampler2D mapAlbedo;

//out vec4 FragColor;

void main() {

	scene = texture( mapAlbedo, Uv );
	scene.rgb *= 0.75;
	if(scene.a == 0.0) discard;

	defaultColor = scene;
	normal = vec4( 0.0 );

}