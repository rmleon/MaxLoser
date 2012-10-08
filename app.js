/**
Author: Ricardo Leon
Date: Jan 2012
*/
/**
 Find the local max losses
*/
Ext.onReady(function () {

    function getMaxLoss(data, restriction, days) {
        if (!data) {
            return 'No data found';
        }
        if (data.getTotalCount() <= 1) {
            return 'At least two elements are required to find a loss';
        }
        if (restriction != 'exact' && restriction != 'less' && Ext.isDefined(restriction)) {
            throw new Error('Invalid restriction: ' + restriction);
        }
        if (Ext.isDefined(days)) {
            if (!Ext.isNumeric(days)) {
                throw new Error('Days must be numeric');
            }
            if (days < 1) {
                throw new Error('Days must be more than 1');
            }
        }

        var maxLoss = 0,
            lastLowIndex = 0,
            lastHighIndex = 0,
            currentValue, currentLoss, lastLowValue = data.getAt(0).get('adjustedClose'),
            lastHighValue = data.getAt(0).get('adjustedClose');

        var meetsExactRestriction, meetsLessRestriction;

        var result;

        for (var i = 1; i < data.getTotalCount(); i += 1) {
            currentValue = data.getAt(i).get('adjustedClose');
            currentLoss = lastHighValue - currentValue;

            var meetsExactRestriction = restriction != 'exact' || i - lastHighIndex == days;
            var meetsLessRestriction = restriction != 'less' || i - lastHighIndex <= days;
            if (currentLoss > maxLoss && lastHighIndex < i && meetsExactRestriction && meetsLessRestriction) {
                maxLoss = currentLoss;
                lastLowValue = currentValue;
                lastLowIndex = i;
                result = {
                    loss: maxLoss,
                    high: lastHighValue,
                    low: lastLowValue,
                    highIndex: lastHighIndex,
                    lowIndex: lastLowIndex
                };
            }
            currentLoss = currentValue - lastLowValue;

            meetsExactRestriction = restriction != 'exact' || lastLowIndex - i == days;
            meetsLessRestriction = restriction != 'less' || lastLowIndex - i <= days;

            if (currentLoss > maxLoss && i < lastLowIndex && meetsExactRestriction && meetsLessRestriction) {
                maxLoss = currentLoss;
                lastHighValue = currentValue;
                lastHighIndex = i;
                result = {
                    loss: maxLoss,
                    high: lastHighValue,
                    low: lastLowValue,
                    highIndex: lastHighIndex,
                    lowIndex: lastLowIndex
                };
            }
            if (lastHighValue < currentValue) {
                lastHighValue = currentValue;
                lastHighIndex = i;
            }


            if ((restriction == 'exact' || restriction == 'less') && i - lastHighIndex >= days - 1 && i - days + 1 > 0) {
                lastHighIndex = i - days + 1;
                lastHighValue = data.getAt(lastHighIndex).get('adjustedClose');
            }
        }
        if (result) {
            return result;
        } else {
            return "No loss found";
        }
    }



    Ext.define('Stock', {
        extend: 'Ext.data.Model',
        fields: [{
            name: 'day',
            type: 'date',
            dateFormat: 'Y-n-j'
        }, {
            name: 'adjustedClose',
            type: 'float'
        }, {
            name: 'formattedDay',
            convert: function (value, record) {
                return Ext.Date.format(record.get('day'), 'M j, Y');
            }
        }]
    });

    var stockStore = Ext.create('Ext.data.JsonStore', {
        model: 'Stock',
        proxy: {
            type: 'ajax',
            url: 'data/ibm.json',
            reader: {
                type: 'json'
            },
            limitParam: undefined,
            startParam: undefined,
            pageParam: undefined
        }
    });

    Ext.require('Ext.chart.theme.*');
    Ext.require('Ext.chart.series.Line');
    Ext.require('Ext.chart.series.Series');

    var chart = Ext.create('Ext.chart.Chart', {
        //animate: true,
        store: stockStore,
        shadow: true,
        theme: 'Green',
        axes: [{
            type: 'Numeric',
            position: 'left',
            fields: ['adjustedClose'],
            title: 'Adjusted Close ($)'
        }, {
            type: 'Time',
            position: 'bottom',
            fields: ['day'],
            title: false,
            dateFormat: 'M j, Y',
            constrain: true,
            fromDate: new Date(2011, 0, 1),
            toDate: new Date(2012, 0, 1),
            step: [Ext.Date.MONTH, 1]

        }],
        series: [{
            type: 'line',
            axis: "left",
            xField: 'formattedDay',
            yField: 'adjustedClose'
        }]
    });

    var days = 5;

    Ext.require('Ext.window.MessageBox');

    function showResult(result) {
        if (!result) {
            Ext.Msg.alert('Max Loss', 'No max loss found');
            return;
        }
        var lowIndex = result.lowIndex,
            highIndex = result.highIndex,
            loss = result.loss;
        Ext.Msg.alert("Max Loss Info", "Max loss found<br/>Dates: [" + stockStore.getAt(highIndex).get('formattedDay') + ' - ' + stockStore.getAt(lowIndex).get('formattedDay') + '], <br/>Values: [' + stockStore.getAt(highIndex).get('adjustedClose') + ' - ' + stockStore.getAt(lowIndex).get('adjustedClose') + ']<br/>Difference: ' + loss);
    };

    var chartWindow = Ext.create('Ext.window.Window', {
        title: 'IBM Stock | close value',
        width: 810,
        height: Ext.getBody().getViewSize().height - 20,
        layout: 'fit',
        items: [chart],
        bbar: [{
            xtype: 'button',
            text: 'Get Max loss',
            listeners: {
                click: function () {
                    var result = getMaxLoss(stockStore);
                    showResult(result);
                }
            }
        }, '-',
        {
            itemId: 'b2',
            xtype: 'button',
            text: 'Get max loss in less than 5 days',
            changeDays: function () {
                this.setText('Get max loss in less than ' + days + (days != 1 ? ' days' : ' day'));
            },
            listeners: {
                click: function () {
                    var result = getMaxLoss(stockStore, 'less', days);
                    showResult(result);
                }
            }
        }, '-',
        {
            itemId: 'b3',
            xtype: 'button',
            text: 'Get max loss in exactly 5 days',
            changeDays: function () {
                this.setText('Get max loss in exactly ' + days + (days != 1 ? ' days' : ' day'));
            },
            listeners: {
                click: function (obj) {
                    var result = getMaxLoss(stockStore, 'exact', days);
                    showResult(result);
                }
            }

        }, '-',
        {
            xtype: 'textfield',
            fieldLabel: 'Period (days)',
            allowBlank: 'false',
            maskRe: /[0-9]/,
            value: days,
            fieldStyle: 'text-align: right; width: 5em;',
            enforceMaxLength: true,
            maxLength: 4,
            width: 150,
            listeners: {
                change: function (target, newValue) {
                    days = newValue;
                    chartWindow.getDockedComponent(1).getComponent('b2').changeDays();
                    chartWindow.getDockedComponent(1).getComponent('b3').changeDays();
                }
            },
        }, '-']
    });

    stockStore.load({
        callback: function (records, operation, success) {
            if (success) {
                stockStore.sort('day');
                chartWindow.render(Ext.getBody());
                chartWindow.show();
            } else {
                Ext.Msg.alert("Max Loser Chart", "Could not load data");
            }

        }
    });

});