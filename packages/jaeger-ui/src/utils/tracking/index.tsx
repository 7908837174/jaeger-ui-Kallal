// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { TNil } from '../../types';
import { IWebAnalyticsFunc } from '../../types/tracking';
import type IWebAnalytics from '../../types/tracking';
import GA from './ga';
import NoopWebAnalytics from './noopWebAnalytics';
import getConfig, { getConfigValue } from '../config/get-config';
import { getVersionInfo } from '../constants';

const TrackingImplementation = () => {
  const config = getConfig();
  let versionShort;
  let versionLong;

  const versionInfo = getVersionInfo();

  if (versionInfo) {
    try {
      const data = JSON.parse(versionInfo);
      const joiner = [data.objName];
      if (data.changed.hasChanged) {
        joiner.push(data.changed.pretty);
      }
      versionShort = joiner.join(' ');
      versionLong = data.pretty;
    } catch (_) {
      versionShort = versionInfo;
      versionLong = versionInfo;
    }
    versionLong = versionLong.length > 99 ? `${versionLong.slice(0, 96)}...` : versionLong;
  } else {
    versionShort = 'unknown';
    versionLong = 'unknown';
  }

  let webAnalyticsFunc = NoopWebAnalytics;

  if (config.tracking && config.tracking.customWebAnalytics) {
    webAnalyticsFunc = config.tracking.customWebAnalytics as IWebAnalyticsFunc;
  } else if (config.tracking && config.tracking.gaID) {
    webAnalyticsFunc = GA;
  }

  const webAnalytics = webAnalyticsFunc(config, versionShort, versionLong);
  webAnalytics.init();

  return webAnalytics;
};

const tracker = TrackingImplementation();

export function trackPageView(pathname: string, search: string | TNil) {
  return tracker.trackPageView(pathname, search);
}

export function trackError(description: string) {
  return tracker.trackError(description);
}

export function trackEvent(
  category: string,
  action: string,
  labelOrValue?: string | number | TNil,
  value?: number | TNil
) {
  return tracker.trackEvent(category, action, labelOrValue, value);
}

export const context = tracker.context;
export const isWaEnabled = tracker.isEnabled();

let tracked = false;
let trackingEnabled = false;
let trackFn: IWebAnalytics | null = null;

export function init(createTracker: () => IWebAnalytics | undefined) {
  if (tracked) return;
  tracked = true;

  const gaID = getConfigValue('tracking.gaID');
  trackingEnabled = Boolean(gaID);
  if (!trackingEnabled) return;

  const tracker = createTracker();
  if (!tracker) return;

  trackFn = tracker;
}
