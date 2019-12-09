import React, {Component} from "react";
import {
    Icon, 
    IconButton,
    Popover,
    Divider
} from "@material-ui/core/";
import "../../css/CursorState.css";

class CursorPopup extends Component {
    constructor() {
        super();

        this.state = {   
            anchorEl: null,
            obj: {},
            posOpen: false,
            scaleOpen: false,
            rotOpen: false,
            magOpen: false,
            isFunc: false
        };

        this.handleButtonClick = this.handleButtonClick.bind(this);
    }

    componentDidMount() {
        const self = this;

        //Sets focus in ace editor when page loads, which fixes a bug where 
        //it wouldn't be focusable after reloading page
        let editor = window.ace.edit("ace-editor");
        editor.focus(); 
        const n = editor.getSession().getValue().split("\n").length;
        editor.gotoLine(n); 

        const getGutterClick = (e) => {  
            if (window.event) {e = window.event.srcElement;}// (IE 6-8)
            else {e = e.target;}     
            
            if (e.className && e.className.indexOf("ace_gutter-cell") !== -1) {            
                const selectionRange = window.ace.edit("ace-editor").getSelectionRange().start.row + 1;

                const data = this.handleGutterClick(selectionRange);
                let text = data[0];
                let type = data[1];
                let param = data[2];
                let textArr = data[3];

                this.props.render();
                
                //If we clicked on text not in a function or a loop
                if(type === "normal") {
                    // eslint-disable-next-line
                    const func = Function(`'use strict'; ${text}`),
                        cursorState = func();

                    self.setState({
                        anchorEl: e,
                        obj: cursorState,
                        arr: null,
                        isArr: false,
                        index: 0,
                        maxIndex: 0,
                        isFunc: false,
                        params: null,
                        textArr : null,
                        breakpoint: selectionRange,
                        noDiff: false
                    });
                //If we clicked on text in a function
                } else if(type === "func"){

                    let tempDiff = text === "Function made no difference to cursor state" ? true : false;

                    self.setState({
                        anchorEl: e,
                        obj: text,
                        arr: null,
                        isArr: false,
                        index: 0,
                        maxIndex: 0,
                        isFunc: true,
                        params: param,
                        textArr: textArr,
                        breakpoint: selectionRange + 1,
                        noDiff: tempDiff
                    });
                //If we clicked on text in a loop
                } else if(type === "loop"){
                    self.setState({
                        anchorEl: e,
                        obj: text[0],
                        arr: text,
                        isArr: true,
                        index: 0,
                        maxIndex: text.length - 1,
                        isFunc: false,
                        params: null,
                        textArr: null,
                        breakpoint: selectionRange,
                        noDiff: false
                    });
                }
            }
            
        };

        window.addEventListener("click", () => {
            try {
                getGutterClick();
            } catch (e) {
                console.error(e);
            }
        });
    }

    handleGutterClick(breakpoint) {
        let editorDoc = window.ace.edit("ace-editor").getSession().doc;

        //Checks for a function body click
        let isInFunctionBody = this.detectFunctionBody(this.prepText(editorDoc.$lines.slice(0, editorDoc.$lines.length)), breakpoint);
        if(isInFunctionBody) {
            console.log("Function found");
            return isInFunctionBody;
        }
        //Checks for a click inside of loop(s)
        let isInLoop = this.detectLoops(this.prepText(editorDoc.$lines.slice(0, editorDoc.$lines.length)), breakpoint);
        if(isInLoop) {
            console.log("Loop found");
            return [isInLoop, "loop"];
        }

        console.log("Loop found");
        //Handles a click outside of a function & loop
        return this.handleDefaultClick(editorDoc, breakpoint);
    }
    
    handleDefaultClick(editorDoc, breakpoint) {
        let textContainingState = this.prepText(editorDoc.$lines.slice(0, breakpoint));
        textContainingState.unshift("resetCursor();"); //Resets cursor before running code
        textContainingState.push("return getCursor();"); //Now will return the cursor value after the breakpoint

        /* This gets appended to the first array despite it being 'out of bounds'
         * to prevent an error from being thrown if there was a function called 
         * that was defined after the breakpoint  */
        let extraInfoText = editorDoc.$lines.slice(breakpoint, editorDoc.$lines.length);
        extraInfoText = this.prepText(extraInfoText);

        const modifiedTextArr = textContainingState.concat(extraInfoText);
        return [modifiedTextArr.join("\n"), "normal"];
    }

    getObjDiff (obj1, obj2) {
        let diff = null, self = this;
        Object.keys(obj1).map(function(key) {
            if(typeof obj1[key] === "object") {
                let temp = self.getObjDiff(obj1[key], obj2[key]);
                if(temp) {
                    if(diff === null) {
                        diff = {};
                    }
                    diff[key] = temp; 
                }
            } else if(obj1[key] !== obj2[key]) {
                if(diff === null)
                {diff = {};}
                diff[key] = obj2[key];
            }
        });
        return diff;
    }

    detectFunctionBody(textArr, breakpoint) {
        const arr = "anOverlyComplicatedVariableName";
        const unmodArr = [...textArr];
        let start, end;

        console.log(textArr);

        for(let i = 0; i < textArr.length && i <= breakpoint; i ++) {
            if(textArr[i].indexOf("function") !== -1 || textArr[i].indexOf("=>") !== -1) {
                if((textArr[i].indexOf("function") !== -1 || textArr[i].indexOf("=>") !== -1) && (textArr[i].indexOf("{") === -1)){
                    textArr.splice(i, 1);    
                    while(textArr[i].indexOf("{") === -1) { 
                        i ++;
                    }
                }
                let extraCurlyCounter = 0;
                for(let j = i; j < textArr.length; j ++) {
                    if(j !== i && textArr[j].indexOf("{") !== -1 && textArr[j].indexOf('}') === -1) {
                        extraCurlyCounter ++;
                    } else if(textArr[j].indexOf('{') === -1 && textArr[j].indexOf("}") !== -1  && extraCurlyCounter !== 0) {
                        extraCurlyCounter --;
                    } else if(textArr[j].indexOf('{') === -1 && textArr[j].indexOf("}") !== -1 && extraCurlyCounter === 0) {
                        if(i + 1 <= breakpoint && breakpoint <= j + 1){
                            start = i;
                            end = j;

                            const varArr = this.findVars([...textArr], start, end);
                            
                            this.refactorVars([...textArr], [...varArr], start, end);

                            textArr.splice(start, 0, "resetCursor();"); //Resets cursor before function body
                            textArr.splice(start, 0, `let ${arr} = [];`);  //Creates array
                            textArr.splice(start + 2, 1);
                            textArr.splice(start+2, 0, `${arr}.push(JSON.parse(JSON.stringify(getCursor())));`);    //Stores value at beginning of function body
                            textArr.splice(end+3, 0, `return ${arr};`);  //All values get returned at end
                            textArr.splice(end+3, 0, `${arr}.push(JSON.parse(JSON.stringify(getCursor())));`);    //Stores value at beginning of each loop iteration in it
                            textArr.splice(end + 2, 1);
                            
                            const params = this.findParams();
                            const text = textArr.join("\n");
                            let func = null, beforeAfter = null, diff = null;
                            if(!params) {
                                // eslint-disable-next-line
                                func = Function(`'use strict'; ${text}`);
                                beforeAfter = func();
                                diff = this.getObjDiff(beforeAfter[0], beforeAfter[1]);
                                if(diff)
                                {return [diff, "func"];}
                            }

                            try {
                                // eslint-disable-next-line
                                func = Function(`'use strict'; ${text}`);
                                beforeAfter = func();   
                                diff = this.getObjDiff(beforeAfter[0], beforeAfter[1]);
                                if(diff) {return [diff, "func"];}  
                                //Params don't need to be returned because they aren't used in
                                // cursor state setting calls, otherwise we would have gotten an error 
                            } catch(e) {
                                // We have parameters and there was an error on eval
                                // user is likely setting state with params
                                return [diff, "func", params, unmodArr];
                            }

                            return ["Function made no difference to cursor state", "func"];
                        } else {break;}
                    }
                }
            }
        }
        return null;
    }
    
    //Finds variables local to a segment of text
    findVars = (textArr, start, end) => {
        const hasDelims = (i, startPos, delims) => {
            for(let j = 0; j < delims.length; j ++) {
                if(textArr[i].indexOf(delims[j] , startPos) !== -1)
                    return true;
            }
            return false;
        };

        let varArr= [];
        let varName = "";
        let varStarted = false;

        //Parse variables from header
        if(textArr[start].indexOf(')') - 1 !== textArr[start].indexOf('(')) {
            //We have arguements being passed in
            for(let i = textArr[start].indexOf('(') + 1; i < textArr[start].length; i ++) {
                if(textArr[start][i].match(/[a-zA-Z_$][0-9a-zA-Z_$]*/)) {
                    varStarted = true;
                    varName = varName.concat(textArr[start][i]);
                } else if(varStarted) {
                    varArr.push(varName);
                    varStarted = false;
                    varName = "";
                }
            }
        }

        //Parse variable from body
        for(let i = start; i <= end; i ++) {

            //If a variable is declared
            if(hasDelims(i , 0, ["let", "const"])) {
                let startInd = textArr[i].indexOf("let") + 3;
                if(textArr[i].indexOf("let") === -1) {
                    startInd = textArr[i].indexOf("const") + 5;
                }
                for(let j = startInd; j < textArr[i].length; j ++) {
                    if(textArr[i][j].match(/[a-zA-Z_$][0-9a-zA-Z_$]*/)) {
                        varStarted = true;
                        varName = varName.concat(textArr[i][j]);
                    } else if(varStarted) {
                        varArr.push(varName);
                        varStarted = false;
                        varName = "";
                    }
                }

                if(varStarted) {
                    varArr.push(varName);
                }
            }
        }

        for(let i = 0; i < varArr.length; i ++) {
            console.log(varArr[i]);
        }

        return varArr;
    }

    //Refactors variable names to avoid name collisions when the function gets flattened
    refactorVars = (textArr, varArr, start, end) => {
        const prefix = "__extendedPrefixToAvoidCollisions__";
        console.log(varArr);
        const prefixedVars = varArr.map( el => {
            return prefix.concat(el);
        });
        console.log(prefixedVars)

        //Check header for var matches
        if(textArr[start].indexOf(')') - 1 !== textArr[start].indexOf('(')) {
            //We have arguements being passed in

            let success;
            for(let j = 0; j < varArr.length; j ++) {
                let str = textArr[start];
                let vari = varArr[j];
                console.log("looking for", vari)
                let ind = 0;
                success = false;

                do {
                    let nextChar = str.slice(str.indexOf(vari, ind) + vari.length, str.indexOf(vari, ind) + vari.length + 1);
                        
                    //Attempt to slice out the variable
                    let temp = str.slice(str.indexOf(vari, ind), str.indexOf(vari, ind) + vari.length)

                    console.log(temp);
                    console.log(nextChar);
                    //Make sure the variable doesn't continue into the next varaible
                    if(temp === vari && !(nextChar.match(/[a-zA-Z_$][0-9a-zA-Z_$]*/)) && nextChar !== "") {
                        let firstHalf = str.slice(0, str.indexOf(vari, ind));
                        let refactoredVar = prefixedVars[j];
                        let secondHalf = str.slice(str.indexOf(vari, ind) + vari.length);
                        
                        //Rebuilds string with refactored variable
                        str = firstHalf + refactoredVar + secondHalf;
                        textArr[start] = str;
                        console.log(textArr[start]);
                        success = true;
                    }
                    ind += vari.length;
                } while(str.indexOf(vari, ind) !== -1 && ind < str.length && !success);
            }
        }

        //Check function body for var matches
        for(let j = start + 1; j <= end ; j ++) {
            let str = textArr[j];
            //Check the line for each variable
            for(let i = 0; i < varArr.length; i ++) {
                if(str.indexOf(varArr[i]) !== -1) { 
                    //Slices what might me a match to the variable to a temp var
                    let temp = str.slice(str.indexOf(varArr[i]), str.indexOf(varArr[i]) + varArr[i].length)
                    console.log(temp);
                    
                    //Gets the character after the end of the potential match
                    let nextChar = str.slice(str.indexOf(varArr[i]) + varArr[i].length, str.indexOf(varArr[i]) + varArr[i].length + 1);
                    console.log(nextChar);

                    //Checks to see if the temp var is actually a match
                    if(temp === varArr[i] && !(nextChar.match(/[a-zA-Z_$][0-9a-zA-Z_$]*/))) {
                        let firstHalf = str.slice(0, str.indexOf(varArr[i]));
                        let refactoredVar = prefixedVars[i];
                        let secondHalf = str.slice(str.indexOf(varArr[i]) + varArr[i].length);
                        
                        //Rebuilds string with refactored variable
                        str = firstHalf + refactoredVar + secondHalf;
                    }
                    console.log(str);
                }

                if(str.slice(str.length - varArr[i]) === varArr[i]) {
                    str = str.replace(varArr[i], prefixedVars[i]); 
                }
            }
            textArr[j] = str;
        }
        console.log(textArr);
    }

    findParams() {
        let editorDoc = window.ace.edit("ace-editor").getSession().doc;
        let breakpoint = window.ace.edit("ace-editor").getSelectionRange().start.row + 1;
        let textArr = this.prepText(editorDoc.$lines.slice(0, editorDoc.$lines.length));

        for(let i = 0; i < textArr.length && i <= breakpoint; i ++) {
            if(textArr[i].indexOf("function") !== -1 || textArr[i].indexOf("=>") !== -1) {
                let extraCurlyCounter = 0;
                for(let j = i; j < textArr.length; j ++) {
                    if(j !== i && textArr[j].indexOf("{") !== -1) {
                        extraCurlyCounter ++;
                    } else if(textArr[j].indexOf("}") !== -1  && extraCurlyCounter !== 0) {
                        extraCurlyCounter --;
                    } else if(textArr[j].indexOf("}") !== -1 && extraCurlyCounter === 0) {
                        if(i + 1 <= breakpoint && breakpoint <= j + 1){
                            //We found a function, and the breakpoint the user clicked on is within the funtion
                            //textArr[i] is the header of the function
                            let paramStr = textArr[i].slice(textArr[i].indexOf("(") + 1, textArr[i].indexOf(")"));
                            let params =  paramStr.split(", ");
                            if(params[0] === "")
                            {return null;}
                            return params;
                        } else {break;}
                    }
                }
            }
        }
    }

    handleRenderParams = () => {
        let textArr = [...this.state.textArr];
        let enteredValues = new Map();
        let start, end;

        for(let i = 0; i < this.state.params.length; i ++) {
            let val = document.getElementById(this.state.params[i]).value;
            if(val === "")
            {val = null;}
            enteredValues.set(this.state.params[i], val);
        }

        for(let i = 0; i < textArr.length && i <= this.state.breakpoint; i ++) {
            if(textArr[i].indexOf("function") !== -1 || textArr[i].indexOf("=>") !== -1) {
                let extraCurlyCounter = 0;
                for(let j = i; j < textArr.length; j ++) {
                    if(j !== i && textArr[j].indexOf("{") !== -1) {
                        extraCurlyCounter ++;
                    } else if(textArr[j].indexOf("}") !== -1  && extraCurlyCounter !== 0) {
                        extraCurlyCounter --;
                    } else if(textArr[j].indexOf("}") !== -1 && extraCurlyCounter === 0) {
                        start = i + 1;
                        end = j;
                        if(start <= this.state.breakpoint && this.state.breakpoint <= end)
                        {break;}
                    }
                }
            }
        }
        let tempBreakpoint = this.state.breakpoint;

        for(let i = start; i <= end; i ++) {
            for(let k = 0; k < this.state.params.length; k ++) {
                const formalParam = this.state.params[k];
                const enteredArg = enteredValues.get(this.state.params[k]);
                if(textArr[i].indexOf(formalParam) !== -1 && enteredArg !== null) {
                    if(enteredArg.indexOf("{") !== -1 && textArr[start].indexOf(enteredArg) === -1) {
                        textArr.splice(start, 0, `let ${formalParam} = ${enteredArg};`);
                        tempBreakpoint++;
                    } else if(enteredArg.indexOf("{") === -1){
                        textArr[i] = textArr[i].replace(formalParam, enteredArg);
                    }
                } 
            }
        }
        
        try {
            const diff = this.detectFunctionBody(textArr, tempBreakpoint)[0];

            window.setTimeout(
                () => {
                    this.setState({
                        obj: diff,
                        arr: null,
                        isArr: false,
                        index: 0,
                        maxIndex: 0,
                        isFunc: true,
                        breakpoint: tempBreakpoint
                    });
                }, 0);
        } catch(e) {
            console.error("Something went wrong with the cursor popup!\n", e);
        }
    }

    detectLoops(textArr, breakpoint) {
        const counter = "anOverlyComplicatedVariableName";
        let start, text = null, numLoops = 0, endOfOuterLoop;
        let insideOfObjectBraces = false;

        const hasLoop = i => {
            if(textArr[i].indexOf("while(") !== -1 || textArr[i].indexOf("for(") !== -1 || textArr[i].indexOf("do {") !== -1) {
                return true;
            }
            return false;
        };

        textArr.unshift("resetCursor();");
        breakpoint ++;
        
        for(let i = 0; i < textArr.length && i <= breakpoint; i ++) {
            if(hasLoop(i)) {
                let extraCurlyCounter = 0;
                for(let j = i + 1; j < textArr.length; j ++) {
                    if(textArr[j].indexOf("{") !== -1) {
                        if(hasLoop(j))
                        {extraCurlyCounter ++;}
                        else if(textArr[j].indexOf("{") !== -1 && textArr[j].indexOf("}") !== -1) {
                            //Inline object
                        } else {
                            //Multiline object
                            insideOfObjectBraces = true;
                        }
                    } else if(textArr[j].indexOf("}") !== -1  && extraCurlyCounter !== 0) {
                        if(insideOfObjectBraces) 
                        {insideOfObjectBraces = false;}
                        else 
                        {extraCurlyCounter --;}
                    } else if((textArr[j].indexOf("}") !== -1 && extraCurlyCounter === 0) && (i + 1 <= breakpoint && breakpoint <= j + 1)) { 
                        start = i;
                        if(numLoops === 0){
                            textArr.splice(start, 0, `let ${counter} = [];`);  //Creates array
                            textArr.splice(start+2, 0, `${counter}.push(JSON.parse(JSON.stringify(getCursor())));`);    //Stores value at beginning of each loop iteration in it
                            i += 2;
                            breakpoint += 2;
                        } else {
                            textArr.splice(start+1, 0, `${counter}.push(JSON.parse(JSON.stringify(getCursor())));`);    //Stores value at beginning of each loop iteration in it
                            i ++;
                            breakpoint ++;
                        }
                        numLoops++;
                        break;
                    } else if((textArr[j].indexOf("}") !== -1 && extraCurlyCounter === 0) && !(i + 1 <= breakpoint && breakpoint <= j + 1)){ 
                        //They did not click within the loop :'(
                        break;
                    }
                }
            }
        }

        let extraCurlyCounter = 0;
        endOfOuterLoop = -1;

        if(numLoops > 0) {
            for(let i = 0; i < textArr.length && i <= breakpoint; i ++) {
                if(hasLoop(i)) {
                    extraCurlyCounter = 0;
                    for(let j = i + 1; j < textArr.length; j ++) {
                        if(textArr[j].indexOf("{") !== -1) {
                            if(hasLoop(j)) {
                                extraCurlyCounter ++;
                            } else if(textArr[j].indexOf("{") !== -1 && textArr[j].indexOf("}") !== -1){
                                //Inline object
                            } else {
                                //Multiline object
                                insideOfObjectBraces = true;
                            }
                        } else if(textArr[j].indexOf("}") !== -1  && extraCurlyCounter !== 0) {
                            if(insideOfObjectBraces) {
                                insideOfObjectBraces = false;
                            }
                            else {
                                extraCurlyCounter --;
                            }
                        } else if((textArr[j].indexOf("}") !== -1 && extraCurlyCounter === 0) && (i + 1 <= breakpoint && breakpoint <= j + 1)){
                            endOfOuterLoop = j;
                            break;
                        }
                    }
                    if(endOfOuterLoop !== -1){
                        break;
                    }
                }
            }
            textArr.splice(endOfOuterLoop + 1, 0, `${counter}.push(JSON.parse(JSON.stringify(getCursor())));`);  //All values get returned at end
            textArr.splice(endOfOuterLoop + 2, 0, `return ${counter};`);  //All values get returned at end
            text = textArr.join("\n");
            // eslint-disable-next-line
            let func = Function(`'use strict'; ${text}`);
            return func();
        }
        return null;
    }
    
    //Removes comments and comments out return statements (the chnages don't affect the actual text in the editor)
    prepText(textArr) {
        //Comments out return statements
        for(let i = 0; i < textArr.length; i ++) {
            if(textArr[i].indexOf("return") !== -1) {
                textArr[i] = "//" + textArr[i];
            }
        }
        
        //Removes normal comments
        for(let i = 0; i < textArr.length; i ++) {
            let index = textArr[i].indexOf("//");
            if(index !== -1) {
                textArr[i] = textArr[i].slice(0, index);
            }
        }

        let foundStartOfComment = false;

        //Removes multiline comments
        for(let i = 0; i < textArr.length; i ++) {
            if(textArr[i].indexOf("/*") !== -1) {
                foundStartOfComment = true;
                for(let j = i; j < textArr.length; j ++) {
                    //Multiline comment is terminated within breakpoint
                    if(textArr[j].indexOf("*/") !== -1) {
                        for(let k = i + 1; k < j; k ++) {
                            textArr[k] = "";
                        }
                        textArr[i] = textArr[i].slice(0, textArr[i].indexOf("/*"));
                        textArr[j] = textArr[j].slice(textArr[j].indexOf("*/") + 2, textArr[j].length);
                        i = j;
                        break;
                    //Multiline comment is not terminated within the breakpoint
                    } else if(j === textArr.length - 1) {
                        for(let k = i + 1; k <= j; k ++) {
                            textArr[k] = "";
                        }
                        textArr[i] = textArr[i].slice(0, textArr[i].indexOf("/*"));
                        i = j;
                    }
                }
            }
        }

        /*If we havent found the start of a multiline comment, we check to make sure
        that the multiline comment was not started in a part of the array we may not have access
        to here. This can happen because we split the entire textArr in half when handling
        out of loop and function clicks
        */
        if(!foundStartOfComment) {
            for(let i = 0; i < textArr.length; i ++) {
                if(textArr[i].indexOf("*/") !== -1) {
                    for(let j = 0; j < i; j ++) {
                        textArr[j] = "";
                    }
                    textArr[i] = textArr[i].slice(textArr[i].indexOf("*/") + 2, textArr[i].length);
                }
            }
        }
        return textArr;
    }

    size(obj) {
        let size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key) && typeof obj[key] === "object") {size++;}
        }
        return size;
    }

    handleButtonClick = key => {
        switch (key) {
            case "position":
                this.setState({
                    posOpen: !this.state.posOpen
                });
                break;
            case "scale":
                this.setState({
                    scaleOpen: !this.state.scaleOpen
                });
                break;
            case "rotation":
                this.setState({
                    rotOpen: !this.state.rotOpen
                });
                break;
            case "magnitude":
                this.setState({
                    magOpen: !this.state.magOpen
                });
                break;
            case "left" :
                if(this.state.index !== 0)
                {this.setState({
                    obj: this.state.arr[this.state.index - 1],
                    index: this.state.index - 1
                });}
                break;
            case "right" :
                if(this.state.index !== this.state.maxIndex)
                {this.setState({
                    obj: this.state.arr[this.state.index + 1],
                    index: this.state.index + 1
                });}
                break;
            default:
                break;
        }
    }

    getOpen = key => {
        switch (key) {
            case "position":
                return this.state.posOpen ? "block" : "none";
            case "scale":
                return this.state.scaleOpen ? "block" : "none";
            case "rotation":
                return this.state.rotOpen ? "block" : "none";
            case "magnitude":
                return this.state.magOpen ? "block" : "none";
            default:
                break;
        }
    }

    getIconType = key => {
        switch (key) {
            case "position": return "my_location";
            case "scale": return "zoom_out_map";
            case "rotation": return "sync";
            case "magnitude": return "transform";

            default: return "help";
        }
    }

    getHex = value => {
        if(this.colorNameToHex(value)) {
            return this.colorNameToHex(value);
        } else if(value[0] === "#") {
            return value;
        } else {
            const rgb = this.getRGB(value);
            const temp = this.rgbToHex(rgb.red, rgb.green, rgb.blue);
            return temp;
        }
    }

    componentToHex(c) {
        const hex = Math.abs(c).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }
      
    rgbToHex(r, g, b) {
        return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
    }

    getRGB(str){
        const match = str.match(/rgba?\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3})\)?(?:, ?(\d(?:\.\d?))\))?/);
        return match ? {
            red: match[1],
            green: match[2],
            blue: match[3]
        } : null;
    }

    colorNameToHex(color){
        const colors = {"aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",
            "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887",
            "cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
            "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f",
            "darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkturquoise":"#00ced1",
            "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dodgerblue":"#1e90ff",
            "firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",
            "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f",
            "honeydew":"#f0fff0","hotpink":"#ff69b4","indianred ":"#cd5c5c","indigo":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c",
            "lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080","lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2",
            "lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightsteelblue":"#b0c4de",
            "lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6",
            "magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3","mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee",
            "mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5",
            "navajowhite":"#ffdead","navy":"#000080","oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6",
            "palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080",
            "rebeccapurple":"#663399","red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1",
            "saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","snow":"#fffafa","springgreen":"#00ff7f","steelblue":"#4682b4",
            "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0",
            "violet":"#ee82ee","wheat":"#f5deb3","white":"#ffffff","whitesmoke":"#f5f5f5","yellow":"#ffff00","yellowgreen":"#9acd32"};

        if (typeof colors[color.toLowerCase()] !== "undefined")
        {return colors[color.toLowerCase()];}

        return false;
    }

    helper = (key, value, firstPass) => {
        const shouldRenderObjects = typeof value === "object" && value !== null && !firstPass; 
        const shouldRenderOther = (typeof value !== "object" && firstPass) || (typeof value === "object" && !firstPass);

        if(shouldRenderObjects) {
            //This maps out all of the key/value pairs in an object
            const str = Object.keys(value).map(k => {
                return this.helper(k, value[k], (Boolean(typeof value[k] !== "object")));
            });
            const iconType = this.getIconType(key);
            const shouldDisplayStyle = { "display": this.getOpen(key) };

            return (
                <div  className = "col-auto">
                    <div className = "iconContainer">
                        <IconButton
                            onClick={ () => this.handleButtonClick(key) }
                            variant="raised"
                            color="primary">
                            <Icon className="material-icons">{iconType}</Icon>
                        </IconButton>
                    </div>

                    <div id = "objectContainer">
                        <div style = {shouldDisplayStyle}>
                            <h6>{this.capitalize(key)}</h6>
                            {str}
                        </div>
                    </div>
                </div>
            );
        } else if(shouldRenderOther) {
            return (
                <div className = "row">
                    {key !== "color" ?
                            <>
                                <div className = "col-8">
                                    <p className = "keyPara"> {this.capitalize(key)}</p>
                                </div> 
                                <div className = "col-4">
                                    <p className = "valuePara"> {this.capitalize(value) + ""}</p>
                                </div> 
                            </>
                        :
                            <>
                                <div className = "col-8">
                                    <p className = "keyPara"> {this.capitalize(key)}</p>
                                </div> 
                                <div className = "col-4">
                                    <div className = "row">
                                        <input style = {{"display": "inline-block"}} type = "color" value = {this.getHex(value)} disabled = {true}/>
                                        <p className = "valuePara"> {this.capitalize(value) + ""}</p>
                                    </div>
                                </div> 
                            </>
                    }
                </div>        
            );
        }
    }

    handleClose() {
        this.setState({
            anchorEl: null
        });
    }

    capitalize = word => {
        try {
            if(typeof word === "boolean") {
                return word ? "True" : "False";
            }
            return word.toString().charAt(0).toUpperCase() + word.slice(1);
        }
        catch(e) {
            return word;
        }
    }

    paramInputHelper = () => {
        return (
            <div className = "row" id = "input_row">
                <div className = "col-6">
                    {
                        this.state.params.map(param => (
                            <input id = {param} className = "param_input" 
                                type = "text" placeholder = {param}/>
                        ))
                    }
                </div>
                <div className = "col-3">
                    <input id = "submit_button" type = "submit" onClick = {this.handleRenderParams}/>
                </div>
                <div className = "col-12">
                    <Divider id = "param_divider" variant="middle" />
                </div>
            </div>
        );
    }

    render() {
        return (
            <div>
                <Popover
                    id={this.state.open ? "cursor_popover" : undefined}
                    open={Boolean(this.state.anchorEl)}
                    anchorEl={document.getElementById("scene")}
                    onClose={this.handleClose.bind(this)}
                    anchorOrigin={{
                        vertical: "top",
                        horizontal: "left"
                    }}
                    transformOrigin={{
                        vertical: "top",
                        horizontal: "left"
                    }} >
                    
                    <div id = "popover_div">
                        {
                            this.state.isArr ?
                                <div className = "row">                                
                                    <div className = "col-3">
                                        <IconButton
                                            onClick={ () => this.handleButtonClick("left") }
                                            variant="raised"
                                            color="primary">
                                            <Icon className="material-icons">chevron_left</Icon>
                                        </IconButton>    
                                    </div>
                                    <div className = "col-6">
                                        <h4>Cursor State</h4>
                                        {
                                            this.state.isFunc && this.state.index === 0
                                                ? <h7>Before function</h7>
                                                :
                                                this.state.isFunc && this.state.index === 1
                                                    ? <h7>After function</h7>
                                                    :
                                                    this.state.index === 0 
                                                        ? <h7> Pre-loop cursor</h7>
                                                        : <h7> Iteration {this.state.index} of {this.state.maxIndex}</h7>

                                        }
                                    </div>
                                    <div className = "col-3">
                                        <IconButton
                                            onClick={ () => this.handleButtonClick("right") }
                                            variant="raised"
                                            color="primary">
                                            <Icon className="material-icons">chevron_right</Icon>
                                        </IconButton>
                                    </div>
                                </div> 
                                : 
                            <>
                                <h4 id = "title">Cursor State</h4>
                                {
                                    this.state.isFunc && Boolean(this.state.params) 
                                        ? <this.paramInputHelper /> : null
                                }
                            </>
                        }
                        {
                            //Renders all non objects first
                            (!this.state.noDiff && (!this.state.params || this.state.obj)) ? Object.keys(this.state.obj).map(key => {
                                return this.helper(key, this.state.obj[key], true);
                            }) : null 
                        }
                        {
                            //Renders objects in a second sweep
                            <>
                                {!this.state.noDiff && this.size(this.state.obj) > 0 ? <Divider variant="middle" /> : null}
                                <div className = "row">
                                    {
                                        (!this.state.params || this.state.obj) ? Object.keys(this.state.obj).map(key => {
                                            return this.helper(key, this.state.obj[key], false);
                                        }) : null
                                    }
                                </div>
                            </>
                        }
                        {
                            this.state.noDiff ?
                                <p> The function made no difference to the cursor state </p>
                                :null
                        }
                    </div>
                </Popover>
            </div>
        );
    }
}

export default CursorPopup;