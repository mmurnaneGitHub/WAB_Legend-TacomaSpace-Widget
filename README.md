## WAB_Legend-TacomaSpace-Widget
Legend Widget for TacomaSpace (https://wspdsmap.cityoftacoma.org/website/tacomaspace/) - Customization creates CSV layer on map and removes console errors on related records popup.

Version 2.13

INSTRUCTIONS:
1. Copy Legend folder to \widgets\Legend
2. Copy RelatedRecordsPopupProjector.js to \jimu.js\RelatedRecordsPopupProjector.js


Notes:
Modify \jimu.js\RelatedRecordsPopupProjector.js - Comment out line 669 (html.place(domNode, this._getRefDomNode(), "after");) to fix console popup error (Uncaught TypeError: Cannot read property 'parentNode' of null) only in WAB (related record). 

