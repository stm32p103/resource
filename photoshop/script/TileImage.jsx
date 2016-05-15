// BEGIN__HARVEST_EXCEPTION_ZSTRING
<javascriptresource>
<name>$$$/JavaScripts/TileImage/Name=Generate Multi-level Tile Image...</name>
<menu>automate</menu>
<enableinfo>true</enableinfo>
</javascriptresource>
// END__HARVEST_EXCEPTION_ZSTRING

//##############################################################################
// 定数定義
const MAX_LEVEL = 3;
const TILE_SIZE = 256;		// tile length(px)

var	saveOpt = new JPEGSaveOptions();
	saveOpt.embedColorProfile = true;
	saveOpt.quality = 2;
	saveOpt.formatOptions = FormatOptions.PROGRESSIVE;
	saveOpt.scans = 3;
	saveOpt.matte = MatteType.NONE;


//##############################################################################
function createDir( dir ){
	var dirObj = new Folder( dir );
	if( !dirObj.exists ){
		dirObj.create();
	}
	return dirObj;
}

//##############################################################################
// ピラミッド画像
var PyramidImage = function( src, level, anchor ){
	this.src = src;
	this.doc = undefined;

	this.level = level;
	this.activeLevel = 0;
	this.pyramid = [];

	this.anchor = anchor;
}

PyramidImage.prototype.initialize = function(){
	this.doc = this.src.duplicate();
	this.pyramid = [ this.doc.activeLayer ];

	var tmp = this.pyramid[0].duplicate();
	for( var i = 1; i <= this.level; i++){
		tmp.resize( 50, 50, this.anchor);
		tmp.visible = false;
		this.pyramid.push( tmp );
		if( i < this.level ){
			tmp = tmp.duplicate();
		}
	}
}

PyramidImage.prototype.uninitialize = function(){
	this.doc.close( SaveOptions.DONOTSAVECHANGES );
	this.activeLevel = 0;
	this.pyramid = [];
}

PyramidImage.prototype.activateDocument = function( level ){
	activeDocument = this.doc;
	this.pyramid[ this.activeLevel ].visible = false;

	this.activeLevel = level;
	this.pyramid[ level ].visible = true;
	this.doc.activeLayer = this.pyramid[ level ];
}

//##############################################################################
// タイル画像
var TileImage = function( src, length, level ){
	this.src = src;
	this.length = length;
	this.row = Math.ceil( src.height / length );
	this.column = Math.ceil( src.width / length );

	// ピラミッド画像がタイル1枚より小さくなったらそれ以上は縮小しないよう制限
	var minTile = Math.min( this.row, this.column );
	var maxLevel = Math.min( level, Math.ceil( Math.log( minTile ) / Math.LN2 ) );

	this.pyramid = new PyramidImage( src, maxLevel, AnchorPosition.TOPLEFT);
}

TileImage.prototype.initialize = function(){
	this.pyramid.initialize()
}

TileImage.prototype.uninitialize = function(){
	this.pyramid.uninitialize()
}

TileImage.prototype.copy = function( level, row, col, resume ){
	var x0 = this.length * col;
	var x1 = x0 + this.length;
	var y0 = this.length * row;
	var y1 = y0 + this.length;
	var region = [
					[ x0, y0 ],
					[ x1, y0 ],
					[ x1, y1 ],
					[ x0, y1 ]
				];
	this.pyramid.activateDocument( level );
	activeDocument.selection.select( region );
	activeDocument.selection.copy();
}

TileImage.prototype.maxLevel = function(){
	return this.pyramid.level;
}

TileImage.prototype.rowCount = function( level ){
	return this._tileCount( this.row, level );
}

TileImage.prototype.columnCount = function( level ){
	return this._tileCount( this.column, level );
}

TileImage.prototype._tileCount = function( n, level ){
	return Math.ceil( n / ( Math.pow( 2, level ) ) );
}

//##############################################################################
var TileImageDocument = function( tile ){
	this.tile = tile;
	this.doc = undefined;
}

TileImageDocument.prototype.initialize = function(){
	this.doc = documents.add( this.tile.length, this.tile.length);
}

TileImageDocument.prototype.uninitialize = function(){
	this.doc.close( SaveOptions.DONOTSAVECHANGES );
}

TileImageDocument.prototype.save = function( level, row, column, saveTo, saveOption ){
	this.tile.copy( level, row, column );

	activeDocument = this.doc;
	this.doc.paste(false);
	this.doc.saveAs( saveTo, saveOption, true, Extension.LOWERCASE );

	this.doc.activeLayer.remove();
}

//##############################################################################
var TileImageGenerator = function( src, length, level ){
	this.tile = new TileImage( src, length, level );
	this.generator = new TileImageDocument( this. tile );
}

TileImageGenerator.prototype.initialize = function(){
	this.tile.initialize();
	this.generator.initialize();
}

TileImageGenerator.prototype.uninitialize = function(){
	this.tile.uninitialize();
	this.generator.uninitialize();
}

//-----------------------------------------------------------------------------
// Level
TileImageGenerator.prototype._createLevelDir = function( root, level ){
	createDir( this._levelDirName( root, level ) );
}
TileImageGenerator.prototype._levelDirName = function( root, level ){
	return root + "/" + level;
}

// Row
TileImageGenerator.prototype._createRowDir = function( root, level, row ){
	var dir = createDir( this._rowDirName( root, level, row ) );
}
TileImageGenerator.prototype._rowDirName = function( root, level, row ){
	return this._levelDirName( root, level ) + "/" + row;
}

// File
TileImageGenerator.prototype._file = function( root, level, row, col){
	var filename = this._rowDirName( root, level, row ) + "/" + col;
	return new File( filename );
}
//-----------------------------------------------------------------------------
TileImageGenerator.prototype.generate = function( root, saveOption ){
	for( var level = 0; level <= this.tile.maxLevel(); level++ ){
		this._createLevelDir( root, level );

		for( var row = 0; row < this.tile.rowCount( level ); row++ ){
			this._createRowDir( root, level, row );
			
			for( var col = 0; col < this.tile.columnCount( level ); col++ ){
				this.generator.save( level, row, col,
									 this._file( root, level, row, col),
									 saveOption);
			}
		}
	}
}


//##############################################################################
function main(){
	preferences.rulerUnits = Units.PIXELS;

	var src = activeDocument.fullName;
	var srcObj = new File( src );
	var srcName = srcObj.name;
	var dstObj = createDir( srcObj.parent + "/" + srcName.substr(0, srcName.lastIndexOf('.')));

	var res = confirm( "タイル画像を生成します。\n保存先: " + dstObj.fullName + "/L/R/C.X\n"
                      +"  L : 縮小レベル\n  R: 行番号(画像上が0)\n"
                      +"  C: 列番号(画像左が0)\n  X: 拡張子");

	// No : 中断する
	if( res == false ){
		return 0;
	}

	var tile = new TileImageGenerator( activeDocument, TILE_SIZE, MAX_LEVEL );
	tile.initialize();
	tile.generate( dstObj.fullName, saveOpt );
	tile.uninitialize();
}

//##############################################################################
// 処理開始
main();
