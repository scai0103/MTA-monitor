const express = require('express');
const router = express.Router();
const config = require('config');
const request = require('request');
const logger = require('../../config/logger');
const format = require('string-format');

module.exports = function (app) {

  router.get('/dashboards', getDashboards);
  router.get('/:dashboardId/:deviceId', filterChart);
  router.get("/:dashboardId", filterChart);
  router.post('/:dashboardId/:deviceId', filterChart);
  router.post('/:dashboardId', filterChart);

  return router;
};

function getDashboards(req, res) {
  try {
    const elasticConfig = config.get('Elastic');
    const url = elasticConfig.URI + '/.kibana/_search';

    const requestBody = {
      from: 0,
      size: 100,
      query: {
        constant_score: {
          filter: {
            bool: {
              must: [
                {
                  term: {
                    type: "dashboard"
                  }
                }
              ]
            }
          }
        }
      }
    };

    request(
      {
        url: url,
        method: 'POST',
        strictSSL: false,
        rejectUnhauthorized: false,
        json: requestBody,
      },
      (error, response, body) => {
        try {

          if (error) {
            logger.error(error);
            return res.status(500).json({ error: 'SERVER_ERROR', description: 'getDashboards: Generic error: ' + JSON.stringify(error) });
          }

          if (response.statusCode !== 200) {
            logger.error(body);
            return res.status(500).json({ error: 'SERVER_ERROR', description: 'getDashboards: Generic error: ' + JSON.stringify(body) });
          }

          const dashboards = [];

          body.hits.hits.forEach((record) => {
            var id_segments = record._id.split(':');
            dashboards.push(
              {
                id: id_segments[1],
                name: record._source.dashboard.title
              }
            );
          });

          return res.status(200).json({ dashboards: dashboards });

        } catch (e) {
          logger.error(e);
          res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
        }
      }
    );

  }
  catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
  }
};

function filterChart(req, res) {
  try {
    const kibanaConfig = config.get('Kibana');

    const dashboardId = req.params.dashboardId;

    let deviceId = "*";
    let stationId = "*";
    let templateId = "*";

    let currDate = new Date();
    let fromDate = new Date(currDate.setHours(0, 0, 0, 0));

    if (req.body.from) {
      fromDate = new Date(req.body.from);
    }

    let toDate = new Date(currDate.setHours(23, 59, 59, 0));
    if (req.body.to) {
      toDate = new Date(req.body.to);
    }

    let timeSpanMode = kibanaConfig.defaultTimespanMode;
    if (req.body.from && req.body.to) {
      timeSpanMode = "absolute";
    }

    if (req.params.deviceId) {
      deviceId = "%22" + req.params.deviceId + "%22";
    }
    else if (req.body.device && req.body.device != -1) {
      deviceId = "%22" + req.body.device + "%22";
    }

    if (req.body.station && req.body.station != -1) {
      stationId = "%22" + req.body.station + "%22";
    }

    if (req.body.template && req.body.template != -1) {
      templateId = "%22" + req.body.template + "%22";
    }

    const queryString = format(kibanaConfig.defaultQuery, deviceId, stationId, templateId);

    const fromDateStr = "'" + fromDate.toISOString() + "'";
    const toDateStr = "'" + toDate.toISOString() + "'";

    const iframeUrl = "/proxy/kibana" + // l'endpoint è quello del proxy
      format(kibanaConfig.availabilityDashboardUrl,
        dashboardId,
        fromDateStr,
        timeSpanMode,
        toDateStr,
        queryString);

    return res.json({ iframeUrl: iframeUrl });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
  }
}
