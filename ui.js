var blessed = require('blessed');
var contrib = require('blessed-contrib');

class SQSTopUI  {
    // constructor starts the blessed UI
    constructor(headers, sort_callback) {
        this.headers = headers;
        this.rowData = [];
        this.sort_callback = sort_callback;

        // Create a screen object.
        this.screen = blessed.screen({
            smartCSR: true
        });
    
        // Create a box perfectly centered horizontally and vertically.
        this.table = contrib.table({
            keys: true,
            fg: 'white',
            selectedFg: 'white',
            selectedBg: 'blue',
            interactive: true,
            label: 'SQS Info',
            border: {type: "line", fg: "cyan"},
            columnWidth: [40, 20, 20, 20] /*in chars*/
        });
        //allow control the table with the keyboard
        this.table.focus();
        
        // Append our box to the screen.
        this.screen.append(this.table);
    
        // Quit on Escape, q, or Control-C.
        this.screen.key(['escape', 'q', 'C-c'], function(ch, key) {
            this.userQuit = true
            return process.exit(0);
        });
 
        // somewhat vim like top / bottom (not bothering figuring out keypress sequences)
        this.screen.key(['g'], function(ch, key) {
            this.table.rows.select(0)
            this.screen.render()
        }.bind(this));
        this.screen.key(['j'], function(ch, key) {
            this.table.rows.down(1)
            this.screen.render()
        }.bind(this));
        this.screen.key(['k'], function(ch, key) {
            this.table.rows.up(1)
            this.screen.render()
        }.bind(this));

        this.sortColumn = 1 
        // change sort column
        this.screen.key(['v'], function(ch, key) {
            this.sortColumn = 1
            this.sort_callback()
        }.bind(this));
        this.screen.key(['i'], function(ch, key) {
            this.sortColumn = 2
            this.sort_callback()
        }.bind(this));
        this.screen.key(['o'], function(ch, key) {
            this.sortColumn = 3
            this.sort_callback()
        }.bind(this));
    
        // Render the screen.
        this.screen.render();
    }

    setRows(rowData) {
        //truncate any long queue names
        for (var i in rowData) {
            if (rowData[i][0].length > 36) {
                rowData[i][0] = rowData[i][0].slice(0, 36) + '...'
            }
        }
        this.table.setData({headers: this.headers,
                       data: rowData});
        this.screen.render();
    }
};

exports.SQSTopUI = SQSTopUI;
