using System.IO;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using MoonSharp.Interpreter;
using MoonSharp.Interpreter.Interop;

public class LuaExperiments : MonoBehaviour
{
    public App app;
    Dictionary<string, Script> scripts;

    void Start()
    {
        UserData.RegistrationPolicy = InteropRegistrationPolicy.Automatic;
        Script.DefaultOptions.ScriptLoader = new MoonSharp.Interpreter.Loaders.FileSystemScriptLoader();
        UserData.RegisterAssembly();

        scripts = new Dictionary<string, Script>();


        var pwd = Directory.GetCurrentDirectory();
        // var path = "Assets/experiements";
        var files = Directory.GetFiles(pwd + "/Assets/experiments", "*.lua");
        foreach (var file in files)
        {
            var name = Path.GetFileNameWithoutExtension(file);
            var script = new Script();
            script.Options.DebugPrint = s => Debug.Log(s);

            scripts.Add(name, script);

            script.DoFile(file);
        }

        app.ImagChanged += updateGlobals;

        StartCoroutine(lateStart());
    }

    IEnumerator lateStart()
    {
        yield return new WaitForEndOfFrame();

        setGlobals();
    }

    void setGlobals()
    {
        foreach (var s in scripts)
        {
            var script = s.Value;

            script.Globals["imag"] = app.Imag;
            script.Globals["index"] = Zeta.ImagToIndex(app.Imag);

            var spiral = UserData.Create(app.spiral);
            script.Globals.Set("spiral", spiral);

            var draw = UserData.Create(new DrawProxy());
            script.Globals.Set("draw", draw);
        }
    }

    void updateGlobals(double value)
    {
        foreach (var s in scripts)
        {
            var script = s.Value;

            script.Globals["imag"] = app.Imag;
            script.Globals["index"] = Zeta.ImagToIndex(app.Imag);

            DynValue obj = UserData.Create(app.spiral);
            script.Globals.Set("spiral", obj);



            if (script.Globals["onDraw"] != null)
            {
                script.Call(script.Globals["onDraw"]);
            }
        }
    }
}
