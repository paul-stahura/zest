using UnityEngine;
using Shapes;

// namespace Shapes
// {
//     public static partial class Draw
//     {
//         public static void Text(Vector2 pos, string content) => Text(new Vector3(pos.x, pos.y, 0), content, Draw.Color);
//         public static void Text(Vector2 pos, string content, Color color) => Text(new Vector3(pos.x, pos.y, 0), content, Draw.FontSize, color);
//         public static void Text(Vector2 pos, string content, float fontSize) => Text(new Vector3(pos.x, pos.y, 0), fontSize, Draw.Color);
//         public static void Text(Vector2 pos, string content, float fontSize, Color color)
//         {
//             float deg;
//             Vector3 axis;
//             Camera.main.transform.localRotation.ToAngleAxis(out deg, out axis);
//             Draw.Text(new Vector3(), deg * Mathf.Deg2Rad * axis.z, content, fontSize, color);
//         }
//     }
// }