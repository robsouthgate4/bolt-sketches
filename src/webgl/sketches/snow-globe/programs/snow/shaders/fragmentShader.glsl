#version 300 es

precision highp float;

in vec2 Uv;

layout(location = 0) out vec4 defaultColor;
layout(location = 1) out vec4 scene;
layout(location = 2) out vec4 normal;

//out vec4 FragColor;

void main() {

	scene = vec4( 1.0 );
	defaultColor = scene;
	normal = vec4( 0.0 );

}