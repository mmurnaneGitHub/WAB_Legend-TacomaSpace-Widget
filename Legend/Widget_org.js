///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2017 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dojo/on',
    './Utils',
        './d3', //MJM (from https://d3js.org/)
        'esri/layers/FeatureLayer',  //MJM
        'esri/Color',  //MJM
        'esri/symbols/SimpleLineSymbol',  //MJM
        'esri/symbols/SimpleMarkerSymbol',  //MJM
        'esri/renderers/SimpleRenderer',  //MJM
        'esri/graphic',  //MJM
        'dojo/_base/array',  //MJM
        'esri/InfoTemplate',  //MJM
        'esri/geometry/Point',  //MJM
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidget',
    'jimu/LayerInfos/LayerInfos',
    'esri/dijit/Legend'
], function(declare, lang, html, on, legendUtils,
        d3, FeatureLayer, Color, SimpleLineSymbol, SimpleMarkerSymbol, SimpleRenderer, Graphic, array, InfoTemplate, Point,  
_WidgetsInTemplateMixin, BaseWidget, LayerInfos, Legend) {

  var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
    name: 'Legend',
    baseClass: 'jimu-widget-legend',
    legend: null,
    _jimuLayerInfos: null,


    startup: function() {
      this.inherited(arguments);
          
          /* MJM - Add feature layer to map --------------------------------------------------------------
           Sample: https://developers.arcgis.com/javascript/3/jssamples/fl_featureCollection.html 
           Class: FeatureLayer - https://developers.arcgis.com/javascript/3/jsapi/featurelayer-amd.html
           CBA API Details: \\Geobase-win\CED\GADS\R2017\R192\TacomaSpaceUpdate\CBA_API_Documentation.pdf
           Use &date=11-01-2014 to filter
           CBA CSV Data: https://www.commercialmls.com/api/SaleLeaseListingsByDate?fields=PropertyId,PropertyType,BuildingTotalSquareFeet,LandTotalSquareFeet,ListingID,ListingType,ListPrice,AskingRent,SquareFeetAvailable,WebRemarks,PropertyName,StreetNumber1,StreetName,City,Latitude,Longitude,PrimaryAgentFirstName,PrimaryAgentLastName,PrimaryAgentPhone,PrimaryAgentEmail&date=11-01-2014&token=dc838ef9-f754-47b8-aee9-066e53d49bc5&format=csv
           Maximum of 1 request per every 5 minutes is allowed.
           Upoate Process:
          */ 

         var featureLayer, featureLayerQuery;
         var mapExtent = this.map.extent; //for zooming out to Tacoma on All data query

          // Use proxy if the server doesn't support CORS
            //esriConfig.defaults.io.proxyUrl = "/website/HistoricMap/proxy/proxy.ashx"; //not working - adding csv to end

          //D3 Library -----------------------------------------------------------
           //Use to download file and filter - http://learnjsdata.com/read_data.html
           var data_Tacoma, data_Lease, data_SaleLand, data_SaleBuilding;
           d3.csv("data/CBA_Download.csv", function(data) {
              data_Tacoma = data.filter(function(row) { //once queried filter to records with valid location
                  return row['City'] == 'Tacoma' && row['Longitude'] < 0 && row['Latitude']>0 ;  //filter all CBA data down to Tacoma addresses with valid lat/longs
              })
			  requestSucceeded(); //used D3 to request & filter data, now draw on map

              //FILTER QUERIES
               data_Lease = data_Tacoma.filter(function(row) {
                  return row['ListingType'] == 'For Lease';
               })
               data_SaleLand = data_Tacoma.filter(function(row) {
                  return row['ListingType'] == 'For Sale' && row['PropertyType'] == 'Land' ;
               })
               data_SaleBuilding = data_Tacoma.filter(function(row) {
                  return row['ListingType'] == 'For Sale' && row['PropertyType'] != 'Land' ;
               })

		   });
		  //end D3----------------------------------------------------------------

            //Layer Symbology
            var symbolFill = new Color([0, 151, 51, 0.5]); 
            var marker = new SimpleMarkerSymbol("solid", 25, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([89,95,35]), 1), symbolFill); 
            var renderer = new SimpleRenderer(marker);

            //QueryLayer Symbology
            var colorQuery = new Color([255, 255, 0, 0.25]); //
            var markerQuery = new SimpleMarkerSymbol("solid", 25, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([89,95,35]), 1), colorQuery); 
            var rendererQuery = new SimpleRenderer(markerQuery);
            //Popup Template: title, content
              var template = new InfoTemplate("TacomaSpace.com", 
                                              "<b> ${PropertyName} </b>" +
                                              "<br> <img src='http://www.commercialmls.com/Media/Property/thumb/${PropertyId}.jpg' width='100'>" +
                                              "<br> <i> ${StreetNumber1}  ${StreetName} </i>" +
                                              "<br> <b> ${ListingType} - ${PropertyType}  </b>" +
                                              "<br> ${WebRemarks}" +
                                              "<br> <b>More information:</b> <a target='_blank' href='https://www.commercialmls.com/Search/Index/?st1=&st2=&stpfx=&sname=&stsfx=&city=&st=&zip=&pNum=&co=&add=&rad=-1&crad=&type=2&lpMinHold=&lpMaxHold=&lpMin=&lpMax=&sfMinHold=&sfMaxHold=&sfMin=&sfMax=&soldMinHold=&soldMaxHold=&soldMin=&soldMax=&stat=7%7C1%7C8%7C3%7C2&ptype=&pCat=&busCats=&asfMin=&asfMax=&alsfMin=&alsfMax=&lsfMin=&lsfMax=&bsfMin=&bsfMax=&ma=&lat=&lng=&clat=&clng=&zm=&el=&ps=&sort=-1&id=1&maptype=&cbaid=${ListingID}&wid=25' >CBA Website</a> ");  
          //Create feature collection for data
          var featureCollection = {
              "layerDefinition": {"geometryType": "esriGeometryPoint","objectIdField": "ObjectID", "fields": []},
              "featureSet": {"features": [], "geometryType": "esriGeometryPoint"}
            };
 

          //All Properties - feature layer based on the feature collection
          featureLayer = new FeatureLayer(featureCollection, {
            infoTemplate: template
          });
          featureLayer.title = 'Available Commercial Properties';  //Legend title
          featureLayer.setRenderer(renderer);  //Symbol - needs to be done after layer creation
          
          //Query Layer-----------------------------------------------------------
          featureLayerQuery = new FeatureLayer(featureCollection, {
            infoTemplate: template
          });
          featureLayerQuery.title = 'Available Commercial Properties (filtered)';  //Legend title
          featureLayerQuery.setRenderer(rendererQuery);  //Symbol - do after layer creation
          //----------------------------------------------------------------------
          
          this.map.addLayers([featureLayer]);  //add the feature layer to the map [1]
          this.map.addLayers([featureLayerQuery]);  //add the query feature layer to the map [2]
          featureLayerQuery.setVisibility(false);  //turn off query layer initially (only show during filter queries)

        //Query Filter----------------------------------------------------------
          var filter = document.getElementById("filter");  //Located on Widget.html
          //NEED TO SEND 'THIS' OBJECT THROUGH ALL THE FOLLOWING FUNCTIONS TO ALLOW ZOOM TO PERMIT (this.map)
          filter.addEventListener("change", lang.hitch(this, function(event){
            if (event.target.value === 'All') {
              this.map.setExtent(mapExtent);  //zoom map to Tacoma
              featureLayer.setVisibility(true);  //turn on all data layer
              featureLayerQuery.setVisibility(false);  //turn off query layer
              document.getElementById("queryResults").innerHTML = ""; //empty results details to legend
            } else {
              featureLayer.setVisibility(false);  
              if (event.target.value === 'Lease') {
                lang.hitch(this, requestLayerQuery(this.map, data_Lease));  //update query layer on map
              } else if (event.target.value === 'SaleBuilding') {
                lang.hitch(this, requestLayerQuery(this.map, data_SaleBuilding));  //update query layer on map
              } else {
                lang.hitch(this, requestLayerQuery(this.map, data_SaleLand));  //update query layer on map
              }  
            }
          }));
        //----------------------------------------------------------------------

        function requestSucceeded() {
         //Insert modified JSON here using D3 objects  (use JSON.parse to create object, JSON.stringify to read as string )
         response = JSON.parse('{\"items\":' + JSON.stringify(data_Tacoma) + '}'); //All records using D3
          var features = [];
          array.forEach(response.items, function(item) {  //loop through the items and add to the feature layer
            var attr = {};  //fill in attributes - values to show in popup
            attr["PropertyId"] = item.PropertyId;
            attr["ListingID"] = item.ListingID;
            attr["PropertyType"] = item.PropertyType;
            attr["StreetNumber1"] = item.StreetNumber1;
            attr["StreetName"] = item.StreetName;
            attr["PropertyName"] = item.PropertyName;
            attr["ListingType"] = item.ListingType;
            attr["WebRemarks"] = item.WebRemarks;
            var geometry = new Point( {"x": item.Longitude, "y": item.Latitude, "spatialReference": {"wkid": 4326 } });    //Use data coordinate field names
            var graphic = new Graphic(geometry);
            graphic.setAttributes(attr);
            features.push(graphic);
          });

          featureLayer.applyEdits(features, null, null); //Apply edits to the feature layer. Updates layer.
          if (screen.width>1000) {  //Determine screen size forclusters (popup problem for clusters on mobile in WAB)
            featureLayer.setFeatureReduction({type: "cluster", clusterRadius: 60}); //Cluster symbols
          }
          featureLayerQuery.setVisibility(false);  //turn off query layer (only show during queries)
        }

        function requestLayerQuery(myMap, value) {
         //Insert modified JSON here with D3 objects  (use JSON.parse to create object, JSON.stringify to read as string )
         response = JSON.parse('{\"items\":' + JSON.stringify(value) + '}'); //query data as json object
         featureLayerQuery.clear();  //Clears all graphics (reset query to zero)
         var features = [];
         var resultsText = response.items.length + ' Selected Properties';
          array.forEach(response.items, function(item) {  //loop through the items and add to the feature layer
            //Map markers
            var attr = {};  //fill in attributes - values to show in popup
	            attr["PropertyId"] = item.PropertyId;
	            attr["ListingID"] = item.ListingID;
	            attr["PropertyType"] = item.PropertyType;
	            attr["BuildingTotalSquareFeet"] = item.BuildingTotalSquareFeet;
	            attr["LandTotalSquareFeet"] = item.LandTotalSquareFeet;
	            attr["ListPrice"] = item.ListPrice;
	            attr["SquareFeetAvailable"] = item.SquareFeetAvailable;
	            attr["AskingRent"] = item.AskingRent;
	            attr["StreetNumber1"] = item.StreetNumber1;
	            attr["StreetName"] = item.StreetName;
	            attr["PropertyName"] = item.PropertyName;
	            attr["ListingType"] = item.ListingType;
	            attr["WebRemarks"] = item.WebRemarks;
	            attr["PrimaryAgentFirstName"] = item.PrimaryAgentFirstName;
	            attr["PrimaryAgentLastName"] = item.PrimaryAgentLastName;
	            attr["PrimaryAgentPhone"] = item.PrimaryAgentPhone;
	            attr["PrimaryAgentEmail"] = item.PrimaryAgentEmail;
            var geometry = new Point( {"x": item.Longitude, "y": item.Latitude, "spatialReference": {"wkid": 4326 } });    //Use coordinate field names from data
            var graphic = new Graphic(geometry);
            graphic.setAttributes(attr);
            features.push(graphic);
            //Results text - values to show in legend panel 
            resultsText += "<hr color='#acb1db'><br>";
	            resultsText += "<b>" + item.PropertyName + "</b><br>";
	            resultsText += "<img src='http://www.commercialmls.com/Media/Property/thumb/" + item.PropertyId + ".jpg' width='100'><br>";
	            resultsText += "<b>Property Type: </b>" + item.PropertyType + "<br>";
	            if (item.BuildingTotalSquareFeet > 0) {
	            	resultsText += "<b>Building: </b>" + _numberWithCommas(item.BuildingTotalSquareFeet) + " SF<br>";
	            }
	            if (item.LandTotalSquareFeet > 0) {
	            	resultsText += "<b>Lot: </b>" + _numberWithCommas(item.LandTotalSquareFeet) + " SF<br>";
	            }
	            if (item.ListPrice > 0) {
	            	resultsText += "<b>List Price : </b>$" + _numberWithCommas(item.ListPrice) + "<br>";
	            }
	            if (item.SquareFeetAvailable > 0) {
	            	resultsText += "<b>Available: </b>" + _numberWithCommas(item.SquareFeetAvailable) + " SF<br>";
	            }
	            if (item.AskingRent > 0) {
	            	resultsText += "<b>Rent : </b>$" + parseFloat(item.AskingRent).toFixed(2) + "<br>";
	            }
	            resultsText += "<b>Description: </b>" + item.WebRemarks + "<br>";
	            resultsText += "<b>Address: </b>" + item.StreetNumber1 + " " + item.StreetName + "<br>";
	            resultsText += "<b>Agent: </b>" + item.PrimaryAgentFirstName + " " + item.PrimaryAgentLastName + "<br>";
	            if (item.PrimaryAgentPhone.length>0) {
	            	resultsText += "<b>Phone: </b>" + item.PrimaryAgentPhone.slice(0, 3) + "." + item.PrimaryAgentPhone.slice(3, 6) + "." + item.PrimaryAgentPhone.slice(6, 10) + "<br>";
	            }
	            resultsText += "<b>Email: </b><a href='mailto:" + item.PrimaryAgentEmail + "'>" + item.PrimaryAgentEmail + "</a><br>";
	            resultsText += "<b>More information: </b><a target='_blank' href='https://www.commercialmls.com/Search/Index/?st1=&st2=&stpfx=&sname=&stsfx=&city=&st=&zip=&pNum=&co=&add=&rad=-1&crad=&type=2&lpMinHold=&lpMaxHold=&lpMin=&lpMax=&sfMinHold=&sfMaxHold=&sfMin=&sfMax=&soldMinHold=&soldMaxHold=&soldMin=&soldMax=&stat=7%7C1%7C8%7C3%7C2&ptype=&pCat=&busCats=&asfMin=&asfMax=&alsfMin=&alsfMax=&lsfMin=&lsfMax=&bsfMin=&bsfMax=&ma=&lat=&lng=&clat=&clng=&zm=&el=&ps=&sort=-1&id=1&maptype=&cbaid=" + item.ListingID + "&wid=25' >CBA Website</a><br>"
	            resultsText += "<b><a href='javascript:void(0);'  id='" + item.ListingID + "' >Zoom to</a></b><br>&nbsp;<br>"; 
          });
         featureLayerQuery.applyEdits(features, null, null); //Update features in the query layer. Updates layer.
         featureLayerQuery.setVisibility(true); //make query layer visible on map
         document.getElementById("queryResults").innerHTML = resultsText; //send query result details to legend - Widget.html
           //now that widget panel has the html text loop through again and add zoom click event by ListingID 
            array.forEach(response.items, function(item) {
              var geometry = new Point( {"x": item.Longitude, "y": item.Latitude, "spatialReference": {"wkid": 4326 } });    //Use coordinate field names from data
              on(document.getElementById("" + item.ListingID + ""), 'click', function(){myMap.centerAndZoom(esri.geometry.geographicToWebMercator(new esri.geometry.Point(geometry)), 19)});  
            });
       }
      
       function _numberWithCommas(x) {
          //check for null values
          if (x) {
              return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          } else {
              return 0;
          }
       }
        //end MJM layer ---------------------------------------------------------------------------------
    },

    onOpen: function() {
      /*
      this.config.legend.map = this.map;
      */
      this._jimuLayerInfos = LayerInfos.getInstanceSync();
      var legendParams = {
        arrangement: this.config.legend.arrangement,
        autoUpdate: this.config.legend.autoUpdate,
        respectCurrentMapScale: this.config.legend.respectCurrentMapScale,
        //respectVisibility: false,
        map: this.map,
        layerInfos: this._getLayerInfosParam()
      };
      this.legend = new Legend(legendParams, html.create("div", {}, this.domNode));
      this.legend.startup();
      this._bindEvent();

           //Modify Widget.html onOpen to add query results section (want it below legend, which gets recreated on every open) - MJM
           var newEl = document.createElement('div');
           newEl.innerHTML = '<div id="queryResults"></div>';
           this.domNode.parentNode.insertBefore(newEl, this.domNode.nextSibling);
           //End Modify Widget.html -------------------------------------------------------------------------------------------------
        
    },

    onClose: function() {
      this.legend.destroy();
	      //MJM - reset panel back to All data ------------------------------------------------------------------
	      this.map.setExtent(this.map._initialExtent);  //zoom map to Tacoma
	      this.map._layers.graphicsLayer3.setVisibility(false);  //turn off query layer
	      this.map._layers.graphicsLayer2.setVisibility(true);  //turn on All data layer
        //document.getElementById("queryResults").remove();  //destroy query results section (text) - doesn't work in IE - doesn't support 'remove'
        document.getElementById("queryResults").innerHTML = '';  //destroy query results section (text)
        //console.error('here');
  		  document.getElementById("filter").options[0].selected=true;  //reset filter - select first option (All)
  		  //-----------------------------------------------------------------------------------------------------
    },


    _bindEvent: function() {
      if(this.config.legend.autoUpdate) {
        this.own(on(this._jimuLayerInfos,
                    'layerInfosIsShowInMapChanged',
                    lang.hitch(this, 'refreshLegend')));

        this.own(on(this._jimuLayerInfos,
                    'layerInfosChanged',
                    lang.hitch(this, 'refreshLegend')));

        this.own(on(this._jimuLayerInfos,
                    'layerInfosRendererChanged',
                    lang.hitch(this, 'refreshLegend')));
      }
    },

    _getLayerInfosParam: function() {
      var layerInfosParam;
      /*
      this.config.legend.layerInfos = [{
        id: "NapervilleShelters_8858",
        hideLayers: []
      }, {
        id: "Wildfire_6998",
        hideLayers: []
      }, {
        id: "911CallsHotspot_3066",
        hideLayers: [0, 1]
      }];
      */

      if(this.config.legend.layerInfos === undefined) {
        // widget has not been configed.
        layerInfosParam = legendUtils.getLayerInfosParam();
      } else {
        // widget has been configed, respect config.
        layerInfosParam = legendUtils.getLayerInfosParamByConfig(this.config.legend);
      }

      // filter layerInfosParam
      //return this._filterLayerInfsParam(layerInfosParam);
      return layerInfosParam;
    },

    refreshLegend: function() {
      var layerInfos = this._getLayerInfosParam();
      this.legend.refresh(layerInfos);
    }

    /*
    _filterLayerInfsParam: function(layerInfosParam) {
      var filteredLayerInfosParam;

      filteredLayerInfosParam = array.filter(layerInfosParam, function(layerInfoParam) {
        var result = true;
        result = result && visiblilityFilter(layerInfoParam, this.config.legend)
        return result;
      }, this);

      return filteredLayerInfosParam;
      function visiblilityFilter(layerInfoParam, legendConfig) {
        var filterResult;
        if(legendConfig.autoUpdate) {
          //filterResult = layerInfoParam.jimuLayerInfo.isShowInMap();
          // filter sub layers
          layerInfoParam.jimuLayerInfo.traversal(function(layerInfo) {
            if(layerInfo.isLeaf()) {
              if(layerInfo.isShowInMap()) {
                filterResult = true;
                if(layerInfo.originOperLayer.mapService &&
                   layerInfo.originOperLayer.mapService.subId !== undefined) {
                     layerInfoParam.hideLayers.push(layerInfo.originOperLayer.mapService.subId);
                }
              }
            }
          });

          layerInfoParam.x = "abc";
        } else {
          filterResult = true;
        }
        return filterResult;
      }
    },
  */
  });
  return clazz;
});
