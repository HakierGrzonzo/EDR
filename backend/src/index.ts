import express from "express";
import morgan from "morgan";
import cors, { CorsOptions } from "cors";
import compression from "compression";
import fs from "fs";
import Cron from "cron";
const app = express();
const Logger = morgan("tiny");

import {
  dispatchController,
  trainTimetableController,
} from "./dispatchController.js";
import {
  getServerList,
  getStationsList,
  getTrainsListForPost,
  getServerTz,
  getPlayer,
  getFullTimetable,
  getSpeedLimitsFromSimkol,
  getServerCodeList,
  getTrainsList,
  getServerTime,
  getEdrTimetable,
} from "./serverController.js";
import helmet from "helmet";
import { ISpeedLimitApi } from "./interfaces/ISpeedLimitApi.js";
import { ISpeedLimit } from "./interfaces/ISpeedLimit.js";
import { ConvertSpeedsApiToInternal } from "./helper/speedLimitHelper.js";
import { ICompleteTrainList } from "./interfaces/ICompleteTrainList.js";
import { IFullServerTrain } from "./interfaces/IFullServerTrain.js";
import { IFullTrainTimetable } from "./interfaces/IFullTrainTimetable.js";
import { IAllServerTrain } from "./interfaces/IAllServerTrain.js";
import { IEdrServerTrain } from "./interfaces/IEdrServerTrain.js";

let completeTrainList: ICompleteTrainList = {};
let speeds: ISpeedLimit[];

const doRequestOnServer = async <T>(
  requestFunction: (serverCode: string) => T,
  serverCode: string,
) => {
  try {
    return await requestFunction(serverCode);
  } catch (e) {
    const now = new Date();
    console.log(
      `[${now.toTimeString()}] Error while fetching server timetable (${serverCode}), skipping update!`,
    );
    throw e;
  }
};

const updateTimetable = async () => {
  const serverList = await getServerCodeList().catch(() => {
    console.log("Cannot fetch server code list, skipping timetable update!");
    return undefined;
  });
  if (serverList === undefined) {
    return;
  }
  for (const serverCode of serverList) {
    const functions = [getFullTimetable, getEdrTimetable] as const;
    const [response1, response2] = await Promise.all(
      functions.map((f) => doRequestOnServer(f, serverCode)),
    );
    const detailedTimetable = response1.data as IAllServerTrain[];
    const edrTimetable = response2.data as IEdrServerTrain[];

    const finalTimetable: IFullServerTrain[] = detailedTimetable.map(
      (entry) => {
        const edrEntry = edrTimetable.find(
          (edrEntry) => edrEntry.trainNoLocal === entry.trainNoLocal,
        );

        return {
          ...entry,
          usageNotes: edrEntry?.usageNotes,
          ownNotes: edrEntry?.ownNotes,
          isQualityTracked: edrEntry?.isQualityTracked,
          isOverGauge: edrEntry?.isOverGauge,
          isOverWeight: edrEntry?.isOverWeight,
          isOtherExceptional: edrEntry?.isOtherExceptional,
          isHighRiskCargo: edrEntry?.isHighRiskCargo,
          isDangerousCargo: edrEntry?.isDangerousCargo,
          carrierName: edrEntry?.carrierName,
          timetable: entry.timetable.map((row, i) => {
            const edrTimetableEntry = edrEntry?.timetable?.find(
              (edrRow) => edrRow.indexOfPoint === i,
            );
            const stopType = row?.stopType?.toLowerCase();
            let stopTypeNumber = 0;
            if (stopType === "commercialstop") {
              stopTypeNumber = 1;
            } else if (stopType === "noncommercialstop") {
              stopTypeNumber = 2;
            }

            return {
              ...row,
              actualArrivalTime: edrTimetableEntry?.actualArrivalTime,
              actualDepartureTime: edrTimetableEntry?.actualDepartureTime,
              confirmedBy: edrTimetableEntry?.confirmedBy,
              indexOfPoint: i,
              isActive: edrTimetableEntry?.isActive,
              isConfirmed: edrTimetableEntry?.isConfirmed,
              isStoped: edrTimetableEntry?.isStoped,
              leftTrack: edrTimetableEntry?.leftTrack,
              plannedStop: edrTimetableEntry?.plannedStop,
              stopDuration: edrTimetableEntry?.stopDuration,
              stopTypeNumber,
              timetableType: edrTimetableEntry?.timetableType,
            } as IFullTrainTimetable;
          }),
        } as IFullServerTrain;
      },
    );

    completeTrainList[serverCode] = finalTimetable;
  }
};

const updateSpeedLimits = async () => {
  try {
    const result = await getSpeedLimitsFromSimkol();
    speeds = ConvertSpeedsApiToInternal(result.data);
  } catch {
    console.log(
      "Error while fetching speed limits from the API, falling back to the bundled version!",
    );
    speeds = ConvertSpeedsApiToInternal(
      JSON.parse(fs.readFileSync("../speeds.json", "utf8")) as ISpeedLimitApi[],
    );
  }
};

const cronTimetableUpdater = new Cron.CronJob(
  "30 0,8,16 * * *",
  () => {
    updateTimetable();
  },
  null,
  false,
  "Europe/Warsaw",
);

const cronSpeedLimitUpdater = new Cron.CronJob(
  "0 4 * * *",
  () => {
    updateSpeedLimits();
  },
  null,
  false,
  "Europe/Warsaw",
);

cronTimetableUpdater.start();
cronSpeedLimitUpdater.start();
updateSpeedLimits();
updateTimetable();

const corsConfig: CorsOptions = {
  allowedHeaders: "content-type",
  maxAge: 3600,
};

app
  .use(cors(corsConfig))
  .use(Logger)
  .use(helmet())
  .use(express.json())
  .use(compression());
app
  /*.set("etag", false)
    .set("Cache-control", "no-cache")*/
  .options("*", cors(corsConfig))
  .get("/", (req: express.Request, res: express.Response) =>
    res.send("Simrail Community EDR"),
  )
  .get("/servers", getServerList)
  .get("/server/time/:serverCode", getServerTime)
  .get("/server/tz/:serverCode", getServerTz)
  .get("/stations/:serverCode", getStationsList)
  .get("/trains/:serverCode", getTrainsList)
  .get(
    "/trains/:serverCode/:post",
    (req: express.Request, res: express.Response) =>
      getTrainsListForPost(req, res, completeTrainList[req.params.serverCode]),
  )
  .get(
    "/dispatch/:serverCode/:post",
    (req: express.Request, res: express.Response) =>
      dispatchController(req, res, completeTrainList[req.params.serverCode]),
  )
  .get(
    "/train/:serverCode/:trainNo",
    (req: express.Request, res: express.Response) =>
      trainTimetableController(
        req,
        res,
        completeTrainList[req.params.serverCode],
        speeds,
      ),
  )
  .get("/steam/:steamId", getPlayer);
app.listen(process.env.LISTEN_PORT);

console.log("🚆 Simrail Community EDR backend v2.5");
console.log("💻 https://github.com/simrail/EDR");
console.log("🐛 https://github.com/simrail/EDR/issues");
