using System.IO;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using MoonSharp.Interpreter;

public class LuaExperiments : MonoBehaviour
{
    Script script;

    void Start()
    {
        Script.DefaultOptions.ScriptLoader = new MoonSharp.Interpreter.Loaders.FileSystemScriptLoader();
        script = new Script();
        script.Options.DebugPrint = s => Debug.Log(s);

        var scripts = new Dictionary<string, string>();
        var pwd = Directory.GetCurrentDirectory();
        // var path = "Assets/experiements";
        var files = Directory.GetFiles(pwd + "/Assets/experiments", "*.lua");
        foreach (var file in files)
        {
            var name = Path.GetFileNameWithoutExtension(file);
            scripts.Add(name, File.ReadAllText(file));

            script.DoFile(file);
        }

    }
}
