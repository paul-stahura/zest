using System;
using System.Collections.Generic;

public class Table {
    List<string> cols = new List<string>();
    List<TableRow> rows = new List<TableRow>();

    public void addColumn(string name) {
        foreach (var row in rows) {
            row.addColumn(name);
        }
    }

    public TableRow addRow() {
        var t = new TableRow();
        rows.Add(t);    

        return t;
    }   

    public int getRowCount() {
        return this.rows.Count;
    }
}

public class TableColumn {
    public string name;
    public Type type;
    public string value;

    public TableColumn(string name, Type type, string value) {
        this.name = name;
        this.type = type;
        this.value = value;
    }
}

public class TableRow {
    public Dictionary<string, TableColumn> cols = new Dictionary<string, TableColumn>();

    public void addColumn(string name) {
        if (!cols.ContainsKey(name)) {
            cols[name] = new TableColumn(name, typeof(string), "");
        }
    }

    public void setInt(string col, int i) {
        if (!cols.ContainsKey(col))
            cols[col] = new TableColumn(col, typeof(int), i.ToString());
        else {
            cols[col].type = typeof(int);
            cols[col].value = i.ToString();
        }
    }

    public void setDouble(string col, double d) {
        if (!cols.ContainsKey(col))
            cols[col] = new TableColumn(col, typeof(double), d.ToString());
        else {
            cols[col].type = typeof(double);
            cols[col].value = d.ToString();
        }    
    }
}