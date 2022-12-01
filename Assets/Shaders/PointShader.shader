// Upgrade NOTE: replaced 'mul(UNITY_MATRIX_MVP,*)' with 'UnityObjectToClipPos(*)'

Shader "X-Reticle/PointShader"
{
	Properties
	{
		_Color ("Color", Color) = (1, 1, 1, 1)
	}

	SubShader
	{
		LOD 200

		Pass
		{
			CGPROGRAM
			#pragma vertex vert
			#pragma fragment frag

			float4 Color;

			struct VertexInput
			{
				float4 position : POSITION;
			};

			struct VertexOutput
			{
				float4 position : SV_POSITION;
				float4 color : COLOR;
				float size : PSIZE;
			};

			VertexOutput vert(VertexInput v) {
				VertexOutput o;
				o.position = UnityObjectToClipPos(v.position);
				o.color = Color;
				o.size = 1;
				return o;
			}

			float4 frag(VertexOutput o) : COLOR{
				return o.color;
			}

			ENDCG
		}
	}
}
