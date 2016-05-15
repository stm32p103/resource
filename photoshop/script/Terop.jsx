// BEGIN__HARVEST_EXCEPTION_ZSTRING
<javascriptresource>
<name>$$$/JavaScripts/Terop/Name=Generate Terop from template file...</name>
<menu>automate</menu>
<enableinfo>true</enableinfo>
</javascriptresource>
// END__HARVEST_EXCEPTION_ZSTRING
const MAX_TEMPLATE = 10;

// ####################################################################################################################
/* ----------------------------------------------------------------------------
コンストラクタ
template : 文字列を置換するためのPhotoshopドキュメント = テンプレート
max_templates : 最大何個までのテンプレートに対応するか(整数)
---------------------------------------------------------------------------- */
var TeropTemplate = function( template, max_templates ){
	this.Template = template;
	this.LayerIndex = new Array( max_templates );
	this.ConstructLayerIndex();
}

/* ----------------------------------------------------------------------------
テンプレートを解析し、数字が書かれたテキストレイヤの数字と、対応するレイヤ番号のテーブルを作る
---------------------------------------------------------------------------- */
TeropTemplate.prototype.ConstructLayerIndex = function(){
	var layers = this.Template.layers;
	var count = layers.length;
	for (var i = 0; i < count; i++) {
		var layer = layers[i];

		if ( layer.visible && layer.kind == LayerKind.TEXT && layer.textItem.contents) {
			// テキストレイヤに含まれる文字を数字に変換、番号ならテンプレート番号として認識
			var tmplNum = parseInt( layer.textItem.contents );
			if( !isNaN( tmplNum ) ){
				if( ( tmplNum < this.LayerIndex.length ) && (tmplNum >= 0) ){
					// 添え字 : 画像のテキスト
					// 値 : レイヤインデックス
					this.LayerIndex[ tmplNum ] = i;
				}
			}
		}
	}
}

/* ----------------------------------------------------------------------------
templateString : テンプレート番号のテキストを置き換えるための文字列
---------------------------------------------------------------------------- */
TeropTemplate.prototype.Generate = function( templateString ) {
	var dest = this.Template.duplicate();
	var layers = dest.layers;
	
	for( var i = 0; i < this.LayerIndex.length; i++){
		if( this.LayerIndex[i] != undefined ){
			if( i < templateString.length ){
				// \n, \t, \\ 3種のエスケープシーケンスはあらかじめ改行・タブ・\に変換しておく
				var str = templateString[i].replace(/\\n/g,"\n\r").replace(/\\t/g,"\t").replace(/\\\\/g,"\\");
				layers[ this.LayerIndex[i] ].textItem.contents = str;
			}else {
				// 不足分は空欄
				layers[ this.LayerIndex[i] ].textItem.contents = "";
			}
		}				
	}
	return dest;
}
//####################################################################################################################
// ここから処理本体
function main(){
	// テンプレート置換オブジェクト作成
	var tmpl = new TeropTemplate( app.activeDocument, MAX_TEMPLATE );

	// サンプルコードコピペ : http://www.openspc2.org/book/PhotoshopCS6/easy/save/008/index.html
	var psdOpt = new PhotoshopSaveOptions();
		psdOpt.alphaChannels = true;
		psdOpt.annotations = true;
		psdOpt.embedColorProfile = false;
		psdOpt.layers = true;
		psdOpt.spotColors = false;
		
	var src = File.openDialog("ファイルを選択","*.txt","テキスト","*.tsv","タブ区切り");
	
	// 中断
	if( src == null ){
		return;
	}

	// ファイル・ディレクトリの用意
	var srcObj = new File( src );
	var srcName = srcObj.name;

	var parentDir = srcObj.parent;
	var dirName = parentDir + "/" + srcName.substr(0, srcName.lastIndexOf('.'));
	var dirObj = new Folder( dirName );
	
	// ディレクトリがなかったら追加
	if( !dirObj.exists ){
		dirObj.create();
	}

	// テキストファイルを開いてテンプレートの置換開始
	srcObj.open("r");
	while( !srcObj.eof ){
		// タブで区切って配列へ格納
		var strings = srcObj.readln().split("\t");

		// 最初の1要素はファイル名として認識
		var outputFileName = strings.shift();
		var outputFile = new File( dirObj.fsName + "/" + outputFileName );

		// テンプレートで置換したデータを、作成して名前を付けて保存、保存し終わったら廃棄
		var outputData = tmpl.Generate( strings );
		outputData.saveAs( outputFile, psdOpt, true, Extension.LOWERCASE );
		outputData.close(SaveOptions.DONOTSAVECHANGES);
	}

	srcObj.close();
}
//####################################################################################################################
// メイン関数コール
main();
