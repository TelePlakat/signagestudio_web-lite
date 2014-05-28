/**
 Campaign selector, class extends Backbone > View and used to select a campaign or create a new one
 @class CampaignSelectorView
 @constructor
 @return {Object} instantiated CampaignSelectorView
 **/
define(['jquery', 'backbone'], function ($, Backbone) {

    BB.SERVICES.CAMPAIGN_SELECTOR = 'CampaignSelector';

    var CampaignSelectorView = BB.View.extend({

        /**
         Constructor
         @method initialize
         **/
        initialize: function () {
            var self = this;
            self.m_selectedCampaignID = -1;
            self.m_campainProperties = new BB.View({
                el: Elements.CAMPAIGN_PROPERTIES
            });
            self.m_propertiesPanel = BB.comBroker.getService(BB.SERVICES.PROPERTIES_VIEW);
            self.m_propertiesPanel.addView(this.m_campainProperties);

            this._loadCampaignList();
            this._listenOpenProps();
            this._listenSelectCampaign();
            this._listenInputChange();
            this._wireUI();
        },

        /**
         Wire the UI including new campaing creation and delete existing campaign
         @method _wireUI
         **/
        _wireUI: function(){
            var self = this;

            $(Elements.NEW_CAMPAIGN).on('click', function (e) {
                self.options.stackView.slideToPage(self.options.to, 'right');
                //var campView = BB.comBroker.getService(BB.SERVICES.CAMPAIGN_VIEW);
                //campView.m_selected_campaign_id = -1;
                return false;
            });

            $(Elements.REMOVE_CAMPAIGN).on('click', function (e) {
                if (self.m_selectedCampaignID != -1) {
                    var selectedElement = self.$el.find('[data-campaignid="' + self.m_selectedCampaignID + '"]');
                    var allCampaignIDs = pepper.getStationCampaignIDs();
                    if (_.indexOf(allCampaignIDs, self.m_selectedCampaignID) == -1) {
                        bootbox.confirm($(Elements.MSG_BOOTBOX_SURE_DELETE_CAMPAIGN).text(), function(result) {
                            if (result==true){
                                selectedElement.remove();
                                self._removeCampaignFromMSDB(self.m_selectedCampaignID);
                                self.m_selectedCampaignID = -1;
                            }
                        });
                    } else {
                        bootbox.alert($(Elements.MSG_BOOTBOX_CANT_DELETE_COMP).text());
                        return false;
                    }
                } else {
                    bootbox.alert($(Elements.MSG_BOOTBOX_SELECT_COMP_FIRST).text());
                    return false;
                }
            });
        },

        /**
         Populate the LI with all available campaigns from msdb
         @method _loadCampaignList
         @return none
         **/
        _loadCampaignList: function () {
            var self = this;

            $(Elements.CAMPAIGN_SELECTOR_LIST).html("");
            self.m_selected_resource_id = undefined;
            var campaignIDs = pepper.getCampaignIDs();
            for (var i = 0; i < campaignIDs.length; i++) {
                var campaignID = campaignIDs[i];
                var recCampaign = pepper.getCampaignRecord(campaignID);
                var playListMode = recCampaign['campaign_playlist_mode'] == 0 ? 'sequencer' : 'scheduler';

                var cName = fromAnsi(recCampaign['campaign_name']);

                var snippet = '<a href="#" class="' + BB.lib.unclass(Elements.CLASS_CAMPIGN_LIST_ITEM) + ' list-group-item" data-campaignid="' + campaignID + '">' +
                    '<h4>' + cName + '</h4>' +
                    '<p class="list-group-item-text">play list mode:' + playListMode + '</p>' +
                    '<div class="openProps">' +
                    '<button type="button" class="' + BB.lib.unclass(Elements.CLASS_OPEN_PROPS_BUTTON) + ' btn btn-default btn-sm"><i style="font-size: 1.5em" class="fa fa-tasks"></i></button>' +
                    '</div>' +
                    '</a>';
                $(Elements.CAMPAIGN_SELECTOR_LIST).append($(snippet));
            }
        },

        /**
         Listen select campaign
         @method _listenSelectCampaign
         @return none
         **/
        _listenSelectCampaign: function () {
            var self = this;
            $(Elements.CLASS_CAMPIGN_LIST_ITEM, self.el).on('click', function (e) {
                $(Elements.CLASS_CAMPIGN_LIST_ITEM, self.el).removeClass('active');
                $(this).addClass('active');
                self.m_selectedCampaignID = $(this).data('campaignid');

                var campView = BB.comBroker.getService(BB.SERVICES.CAMPAIGN_VIEW);
                campView.clearContents();
                campView._render();

                self.options.stackView.slideToPage(Elements.CAMPAIGN, 'right');
                return false;
            });
        },

        /**
         Listen for user trigger on campaign selection and populate the properties panel
         @method _listenOpenProps
         @return none
         **/
        _listenOpenProps: function () {
            var self = this;

            $(Elements.CLASS_OPEN_PROPS_BUTTON, self.el).on('click', function (e) {
                $(Elements.CLASS_CAMPIGN_LIST_ITEM, self.el).removeClass('active');
                var elem = $(e.target).closest('a').addClass('active');
                self.m_selectedCampaignID = $(elem).data('campaignid');
                var recCampaign = pepper.getCampaignRecord(self.m_selectedCampaignID);
                var decoded = fromAnsi(recCampaign['campaign_name']);
                $(Elements.FORM_CAMPAIGN_NAME).val(decoded);
                self.m_propertiesPanel.selectView(self.m_campainProperties);
                self.m_propertiesPanel.openPropertiesPanel();
                return false;
            });
        },

        /**
         Remove an entire campaign including its timelines, channels, blocks, template, board etc
         @method removeCampaign
         @return none
         **/
        _removeCampaignFromMSDB: function (i_campaign_id) {
            var self = this;

            var timelineIDs = pepper.getCampaignTimelines(i_campaign_id);

            var recs = pepper.m_msdb.table_campaign_timeline_board_templates();

            for (var i = 0; i < timelineIDs.length; i++) {
                var timelineID = timelineIDs[i];
                pepper.removeTimelineFromCampaign(timelineID);
                var campaignTimelineBoardTemplateID = pepper.removeBoardTemplateFromTimeline(timelineID);
                pepper.removeTimelineBoardViewerChannels(campaignTimelineBoardTemplateID);

                // terrible terrible carnage...when new timeline is added to the board of campaign (always uses first board in lite?)
                // it is somehow NOT saved in the following call datasource...so if you try the call with the newly added timeline it will exception
                //var boardTemplateID = pepper.getGlobalBoardIDFromTimeline(timelineID);
                var boardTemplateID = pepper.getFirstBoardIDofCampaign(i_campaign_id);
                //console.log("First board id: %s", boardTemplateID);

                pepper.removeBoardTemplate(boardTemplateID);
                pepper.removeBoardTemplateViewers(boardTemplateID);
                pepper.removeTimelineFromSequences(timelineID);

                var channelsIDs = pepper.getChannelsOfTimeline(timelineID);
                for (var n = 0; n < channelsIDs.length; n++) {
                    var channelID = channelsIDs[n];
                    pepper.removeChannelFromTimeline(channelID);

                    var blockIDs = pepper.getChannelBlocks(channelID);
                    for (var x = 0; x < blockIDs.length; x++) {
                        var blockID = blockIDs[x];
                        pepper.removeBlockFromTimelineChannel(blockID);
                    }
                }
            }
            pepper.removeCampaign(i_campaign_id);
            pepper.removeCampaignBoard(i_campaign_id);

            // check to see if any other campaigns are left, do some clean house and remove all campaign > boards
            var campaignIDs = pepper.getCampaignIDs();
            if (campaignIDs.length == 0)
                pepper.removeAllBoards();

            self.m_selectedCampaignID = -1;
            self.m_propertiesPanel.selectView(Elements.EMPTY_PROPERTIES);
        },

        /**
         Wire changing of campaign name through campaign properties
         @method _listenInputChange
         @return none
         **/
        _listenInputChange: function () {
            var self = this;
            var onChange = _.debounce(function (e) {
                var text = $(e.target).val();
                var encoded = toAnsi(text);
                pepper.setCampaignRecord(self.m_selectedCampaignID, 'campaign_name', encoded);
                self.$el.find('[data-campaignid="' + self.m_selectedCampaignID + '"]').find('h4').text(text);
            }, 333, false);
            $(Elements.FORM_CAMPAIGN_NAME).on("input", onChange);
        },

        /**
         Get selected campaign id
         @method getSelectedCampaign
         @return {Number} campaign_id
         **/
        getSelectedCampaign: function () {
            return this.m_selectedCampaignID;
        },

        /**
         Set selected campaign id
         @method setSelectedCampaign
         **/
        setSelectedCampaign: function (i_campaign_id) {
            var self = this;
            self.m_selectedCampaignID = i_campaign_id;
        }
    });

    return CampaignSelectorView;

});

