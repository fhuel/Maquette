/**
 * AD_Maquette : Interactive Prototypes Generator
 *
 * @file    AD_Maquette.jsx
 * @author  Manuele Capacci <hello@manuelecapacci.com> and ALLRIGHT Design <allrightdesign.com>
 * @version 1.0 beta
 *
 *
 * @section LICENSE
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies
 * or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 *
 * @section DESCRIPTION
 *
 * AD Maquette is a Photoshop script that generates
 * interactive prototypes from your Photoshop mockups.
 * All you have to do is to follow really simple naming conventions.
 * Organize all your pages (or application status) with layer comps.
 * Name your link layers/layerGroups starting with a "#" (e.g. #pageName)
 * and the relative link over status layer/layerGroup with an ending ":hover" (e.g. #pageName:hover).
 * Where "pageName" is the name of the layerComp you want to link to.
 * And let the script do the rest.
 *
 * @todo This is a first beta release. This script needs a performance improvement.
 *   and general bugfixes but at this point I find it really conenient already
 */




// reference to the photoshop active document
var _doc;
// project export folder
var _folder;
// reference for the initial active comp
var _activeComp;
// reference for the current html file
var _currentHtml;
// array for layer link
var _links = [];
// array for layers :hover
var _hovers = [];
// a reference to the optional Background layer/layergroup
var _backgroundIndex = false;
// flag for missing or mismatching named layers error
var layerError = false;




/**
 * Create folders for project and pages
 *
 * @param  Containing folder path
 * @param  Folder name
 * @return FALSE if error occurs or user cancel
 */
function createFolder( parent, name) {
    var newFolder;
    if ( name === undefined ) {
        // project folder (not page folder)
        var parentFolder = new Folder();
        parentFolder = parentFolder.selectDlg('Chose where to save the mockup folder');
        // if user cancel...
        if ( parentFolder===null ) {
            return false;
        } else {
            // else empty the folder
            var topLevel = Folder( parentFolder.toString() + '/' + _doc.name.slice(0, -4) );
            for(var w =0; w<20;w++){
                // it's not too much reliable, so insist :)
                if(topLevel.exists)
                {
                    folderDelete( topLevel );
                } else {
                    break;
                }
            }
        }

        newFolder = new Folder( parentFolder.toString() + '/' + _doc.name.slice(0, -4) );
    } else {
        newFolder = new Folder( parent + '/' + name );
    }

    if( newFolder.create() ) {
        return newFolder;
    } else {
        alert('Error: \nCannot create folder');
    }
    return false;
}


/**
 * Delete Folders
 *
 * @param  Containing folder path
 */
function folderDelete(topLevel){
    var folders =[];
    folders = findAllFolders(topLevel, folders);
    folders.unshift(topLevel);
    for(var a in folders){
        var fList=folders[a].getFiles();
        for(var f in fList){
            fList[f].remove();
        }
    }
    folders.reverse();
    for(var z in folders){
        folders[z].remove();
    }
}


/**
 * Collect all the folders starting from a path
 *
 * @param  Containing folder path
 * @param  Array to contain the folders
 */
function findAllFolders( srcFolderStr, destArray) {
    var fileFolderArray = Folder( srcFolderStr ).getFiles();
    for ( var i = 0; i < fileFolderArray.length; i++ ) {
        var fileFoldObj = fileFolderArray[i];
        if ( fileFoldObj instanceof File ) {
        } else {
            destArray.push( Folder(fileFoldObj) );
            findAllFolders( fileFoldObj.toString(), destArray );
        }
    }
    return destArray;
}


/**
 * Create a new html file
 *
 * @param  Containing folder path
 * @param  File name
 * @return a reference to the new file or FALSE if error occur 
 */
function createHtmlFile( folder, name ) {

    var newFile = new File( folder.toString() + '/' + name + '.html' );
    if( newFile.open ('w') ) {
        return newFile;
    } else {
        //log('error: file write error');
    }

    return false;
}


/**
 * Export an image
 *
 * @param  Path where to save
 * @param  File name
 * @param  Boolean if it's for an hover status
 * @return a reference to the new file or FALSE if error occur 
 */
function saveImage( folder, name, hover) {

    var pngFile = new File();

    app.activeDocument = _doc;
    _doc.selection.deselect();
    _doc.selection.selectAll();
    // performs a merged copy
    _doc.selection.copy(true);

    // create new doc, paste and crop
    var newDoc = app.documents.add( _doc.width.value, _doc.height.value, 72, name);
    newDoc.paste();
    // Delete background
    newDoc.activeLayer = app.activeDocument.layers[app.activeDocument.layers.length-1];
    newDoc.activeLayer.remove();
    newDoc.selection.selectAll()
    intersectSelectionWithTransparency()
    newDoc.crop(newDoc.selection.bounds)

    // If it's for a hover state
    if(( hover === undefined )||(hover === false)) {
        //log('I am bout to save a simple image...');
        pngFile = new File( folder.toString() + '/' + name + '.png' );
    } else {
        //log('I am bout to save a HOVER image...');
        pngFile = new File( folder.toString() + '/' + name + '_hover.png' );
    }

    // check if the file exists already
    if( pngFile.open ('r') ) {
        //log('file : ' + pngFile + 'already exists');
        // if so ad a character to the name string
        var newName = name.toString()+'1';
        saveImage ( folder, newName, hover );
    } else {
        // else save the image and if not hover write in the html file as well
        
        // :TO CHECK displayDialogs = DialogModes.NO;

        /*
         // SAVE FOR WEB ALTERNATIVE (it take way more time to compute)
        docExportOptions = new ExportOptionsSaveForWeb;
        docExportOptions.format = SaveDocumentType.PNG; //-24 //JPEG, COMPUSERVEGIF, PNG-8, BMP
        docExportOptions.transparency = true;
        docExportOptions.blur = 0.0;
        docExportOptions.includeProfile = false;
        docExportOptions.interlaced = false;
        docExportOptions.optimized = true;
        docExportOptions.quality = 100;
        docExportOptions.PNG8 = false;
        newDoc.exportDocument (pngFile, ExportType.SAVEFORWEB, docExportOptions);
        */

        pngSaveOptions = new PNGSaveOptions();
        newDoc.saveAs (pngFile, pngSaveOptions, true, Extension.LOWERCASE);

        newDoc.close(SaveOptions.DONOTSAVECHANGES);

        if(( hover === undefined )||(hover === false)){
            return name;
        } else {
            return false
        }
    }
}


/**
 * Make all the parents layers visible
 *
 * @param  the layer to start from
 */
function showParents(layer) {
    if(layer.parent) {
        layer.parent.visible = true;
        showParents( layer.parent );
    }
}


/**
 * Make all the children layers visible
 *
 * @param  the layer to start from
 */
function showChildren(layer) {
    if((layer.typename === 'LayerSet')&&(layer.layers.length > 0)) {
        for(var i=0; i<layer.layers.length; i++) {
            layer.layers[i].visible = true;
            showChildren( layer.layers[i] );
        }
    }
}


/**
 * Get the active Layer Comp
 *
 * @return the active Layer Comp
 */
function identifyActiveComp() {
    // Scorro le comps
    for( var c =0; c<_doc.layerComps.length; c++ ) {
        //se è la comp attiva
        if( _doc.layerComps[c].selected ) {
            return _doc.layerComps[c];
        }
    }
    return _doc.layerComps[0];
}


/**
 * Export an image to use as background
 *
 * @return an index that identifies the background layer/layerGroup
 */
function exportBackground() {
    //  Background layer index
    var index = false;
    // Scan all the layers at the root level
    for(var i=0; i<_doc.layers.length; i++) {

        if( _doc.layers[i].visible ) {
            // Switch off all the visible layers that are not the background
            _doc.layers[i].visible = false;
            // If a layer named Background exists
            if( _doc.layers[i].name.toLowerCase() === 'background' ) {
                // store the index
                index = i;
                // make it visible
                _doc.layers[i].visible = true;
            }
        }

        // If background exists
        if ( index !== false ) {
            // Save just the background as background.png
            saveImage(_folder,  'background');
            resetComps();
            hideBackground();
            return index;
        }
    }
}


/**
 * Hide the Background layer/layerGroup
 *
 */
function hideBackground() {
    if( _backgroundIndex !== false ) {
        _doc.layers[_backgroundIndex].visible = false;
    }
}


/**
 * Reset the original LayerComps state
 *
 */
function resetComps() {
    _activeComp.apply();
    _doc.selection.deselect();
}


/**
 * Export an image to use as background
 *
 * @return an index that identifies the background layer/layerGroup
 */
function scanLayerComps() {

    // Scan the layer comps
    for( var i=0; i<_doc.layerComps.length; i++ ) {

        var currentComp = _doc.layerComps[i];

        // make this comp active and hide the background
        currentComp.apply();
        hideBackground();

        // Create an html file and a folder to store the images and name them like the comp
        var currentFolder = createFolder( _folder, currentComp.name );
        _currentHtml = createHtmlFile( _folder, currentComp.name );
        // Write the upper part in the html file
        writeHtmlHead( _currentHtml );

        // make sure that the links and hovers arrays are empty
        _links.length = 0;
        _hovers.length = 0;
        // Scan all the layers, collect the visible link layers and then hide them
        collectLinks( _doc );
        // Export the static page image
        generateStaticPageImage( _currentHtml, currentComp );
        // Hide all the layers
        hideAllLayers( _doc );
        // Generate the link images for the current comp
        generateLinkImages( _folder+'/'+currentComp.name);

        // Close the html file
        writeHtmlFooter( _currentHtml );
    }
}


/**
 * Hide all children layers
 *
 * @param  the parent layer
 */
function hideAllLayers(parentLayer) {
    for (var i=0; i<parentLayer.layers.length; i++) {
        parentLayer.layers[i].visible = false;
        // Check if Layer Folder AND NOT link
        if ( ( parentLayer.layers[i].typename === 'LayerSet' ) && !( parentLayer.layers[i].name.charAt(0) === '#' ) ) {
            hideAllLayers(parentLayer.layers[i]);
        }
    }
}


/**
 * Scan all the visible layers and store links and hovers
 *
 * @param  the parent layer
 */
function collectLinks( parentLayer ) {

    // Scan the layers in parentLayer
    for(var i=0; i<parentLayer.layers.length; i++ ) {
        var currentLayer = parentLayer.layers[i];
        if( currentLayer.visible ) {
            // If it's a link...
            if( currentLayer.name.charAt(0) === '#' ) {
                // If it's a hover...
                if( currentLayer.name.substr(-6) === ":hover" ) {
                    // store a reference in the hovers array
                    _hovers[_hovers.length] = currentLayer;
                    // and hide the layer
                    currentLayer.visible = false;
                }
                // else if it is just a link
                else {
                    // store a reference in the links array
                    _links[_links.length] = currentLayer;
                    // and hide the layer
                    currentLayer.visible = false;
                }
            }
            // ...else f it's a LAYER GROUP call this function again starting from it
            else if(parentLayer.layers[i].typename === 'LayerSet') {
                collectLinks( parentLayer.layers[i] );
            }
        }
    }
}


/**
 * Generate the static page image
 *
 * @param  a reference to the file to save
 * @param  the relative layer comp
 */
function generateStaticPageImage( file, comp ) {
    saveImage( _folder + '/' + comp.name, comp.name, false );
    file.writeln('<img src="'+ comp.name +'/'+ comp.name +'.png">');
}


/**
 * Generate the link and hover images 
 *
 * @param  the containing folder
 */
function generateLinkImages(folder) {
    // scan the link array, export the image and write in the html file
    if(_links.length > 0) {
        for ( var i=0; i<_links.length; i++ ) {
            log('this is a link layer : ' + _links[i].name);
            // Check if a layer comp with the same name of the link exists
            if ( !(relativeCompExists( _links[i].name.slice(1))) ) {
                alert('Warning \nYou have a "#link Layer called '+ _links[i].name + 'but no Layer Comps with the same name...');
                layerError = true;
            }

            var newFilePath;
            _links[i].visible = true;
            showParents( _links[i] );
            showChildren( _links[i] );
            newFilePath = saveImage( folder, 'link_'+_links[i].name.slice(1), false );
            // check that the saving process succeeded and it's not an hover image
            if ( newFilePath !== false ) {
                var strippedFolder = folder.split("/");
                strippedFolder = strippedFolder[strippedFolder.length-1];
                writeHtmlLink( _currentHtml, _links[i], strippedFolder+'/'+newFilePath );
            }
            _links[i].visible = false;
        }
    }
    // scan the link hover array and export the image
    if(_hovers.length > 0) {
        for ( var j=0; j<_hovers.length; j++ ) {
            // Check if a layer comp with the same name of the link hover layer exists
            if ( !(relativeCompExists( _hovers[j].name.slice(1, -6))) ) {
                alert('Warning \nYou have a "#link:hover Layer called '+ _hovers[j].name + ' but no Layer Comps with the same name...');
            }
            _hovers[j].visible = true;
            showParents( _hovers[j] );
            showChildren( _hovers[j] );
            saveImage( folder, 'link_'+_hovers[j].name.slice(1, -6), true );
            _hovers[j].visible = false;
        }
    }
}


/**
 * Generate the link and hover images 
 *
 * @param  the containing folder
 * @return TRUE if the comp exists, else FALSE
 */
function relativeCompExists(name) {
    for(var i=0; i<_doc.layerComps.length; i++) {
        log('i='+i);
        log('_doc.layerComps[i].name '+_doc.layerComps[i].name);
        log('and name '+ name);
        if( _doc.layerComps[i].name === name ) {
            return true;
        }
    }
    return false;
}


/**
 * Write the html head 
 *
 * @param  the html file to write in
 */
function writeHtmlHead(file) {
    file.writeln('<!Doctype html>\n'+
    '<html>\n'+
    '<head>\n'+
    '   <style>\n'+
    '       * { margin:0; padding:0; }\n'+
    '        html { background-image: url(background.png); background-color: #eee;}\n'+
    '        body {position:relative; margin:0 auto; width:'+ _doc.width.value +'px; text-align: center;}\n'+
    '        a{display:block; position: absolute;}\n'+
    '    </style>\n'+
    '    <script>\n'+
    '    window.onload = function() {\n'+
    '        var linkArray = document.getElementsByClassName(\'hover\');\n'+
    '        for (var i=0; i<linkArray.length; i++) {\n'+
    '           var tempURLArray = linkArray[i].getElementsByTagName(\'img\')[0].src.split(/(\\\\|\\/)/g);\n'+
    '           linkArray[i].URL = tempURLArray.pop().slice(0,-4);\n'+
    '           tempURLArray.pop();\n'+
    '           linkArray[i].folder = tempURLArray.pop();\n'+
    '           linkArray[i].cleanImagePath = linkArray[i].folder + \'/\' + linkArray[i].URL;\n'+
    '           ImageExist( linkArray[i] );\n'+
    '       }\n'+

    '       function ImageExist(aElement)\n'+
    '       {\n'+
    '           var loaded = false;\n'+
    '           var img = new Image();\n'+
    '           img.src = aElement.cleanImagePath + \'_hover.png\';\n'+
    '           img.onload = function() {\n'+
    '               setEvents(aElement);\n'+
    '           };\n'+
    '       }\n'+
    '        function setEvents(aElement){\n'+
    '           aElement.onmouseover = function(){\n'+
    '               this.getElementsByTagName(\'img\')[0].src = this.cleanImagePath + \'_hover.png\';\n'+
    '           };\n'+
    '           aElement.onmouseout = function(){\n'+
    '               this.getElementsByTagName(\'img\')[0].src = this.cleanImagePath + \'.png\';\n'+
    '           };\n'+
    '       }\n'+
    '   }\n'+
    '   </script>\n'+
    '</head>\n'+
    '<body>' );
}


/**
 * Write a new link in the html file 
 *
 * @param  the html file to write in
 * @param  the link layer
 * @param  the image link path
 */
function writeHtmlLink( file, layer, filePath ) {
    var offsetX = layer.bounds[0].value;
    var offsetY = layer.bounds[1].value;

    file.writeln('<a href="'+layer.name.slice(1)+'.html" class="hover" style="left:'+offsetX+'px; top:'+offsetY+'px;"><img src="'+filePath+'.png"></a>');
}


/**
 * Excludes completely transparent pixels from the selection
 *
 */
function intersectSelectionWithTransparency(){
  var desc = new ActionDescriptor();
  var ref = new ActionReference();
  ref.putEnumerated( charIDToTypeID( "Chnl" ), charIDToTypeID( "Chnl" ), charIDToTypeID( "Trsp" ) );
  desc.putReference( charIDToTypeID( "null" ), ref );
  var ref1 = new ActionReference();
  ref1.putProperty( charIDToTypeID( "Chnl" ), charIDToTypeID( "fsel" ) );
  desc.putReference( charIDToTypeID( "With" ), ref1 );
  executeAction( charIDToTypeID( "Intr" ), desc, DialogModes.NO );
}


/**
 * Write the lower part in the html file 
 *
 * @param  the html file to write in
 */
function writeHtmlFooter(file) {
    file.writeln('</body>\n'+
    '</html>');
}


/**
 * Initialize the script, call the major functions and manage possible errors and dialogs 
 *
 * @return TRUE if everythig ran ok, else FALSE
 */
function init() {

    // Check that there is at least one document open
    try {
        _doc = app.activeDocument;
    } catch(e) {
        alert('Wait... \nYou need to have a .psd file open to run the script on it!');
        return false;
    }

    // Check for the active document to be saved
    if ( !(_doc.saved) ) {
        alert('Hey, Not So Fast \nYou have to save your .psd document before you can run this script on it, thanks.');
        return false;
    }
    
    // Check if the active document has any layer Comps
    if(_doc.layerComps.length <= 0) {
        alert('Wait... \nYou need to have your pages set up as Layer Comps for this script to work properly... \nTake a look at the how to : indirizzodellhowto.com');
        return false;
    }
    
    // Make sure the the units are in pixels
    preferences.rulerUnits = Units.PIXELS;
    // Open the dialog window and ask for a folder where to save the prototype, a folder named as the .psd file will be created
    _folder = createFolder();
    if ( !(_folder) ) {
        // if there are any issue with the folder creation abort the script execution
        alert('Wait... \nProblems with folders? \nThe script stops');
        return false;
    }
    // Identify the active comp
    _activeComp = identifyActiveComp();
    // Check if there is a layer to use as background, if so return the index
    _backgroundIndex = exportBackground();
    // Scan all the comps and for each make a html file and the link images
    scanLayerComps();
    // Reset the document to the initial status
    resetComps();
    // Show that the script has finished
    if(layerError) {
        alert('Done! \nBut it seems that you have some mismatch in link layer names...\n\nCheck that all your link layers are named after existing Layer Comps or you will probably end with some broken link in your prototype');
    } else {
        alert('Done! \nGreat, it seems that everything ran smoothly');
        return true;
    }

}

init();



// Debug setup and log function
var DEBUG = false;
var _debugfile = false;

/**
 * Create the debug textfile if it doesn't exists yet and then
 * log everything into it if DEBUG = true
 *
 * @param  The message to log
 */
function log( message ) {
    if(DEBUG) {
        if( _debugfile === false ) {
            alert('Created debug.txt file in the mockup root folder');
            _debugfile = new File( _folder.toString() + '/debug.txt' );
            _debugfile.open ('w');
        }
        _debugfile.writeln( message );
    }
}