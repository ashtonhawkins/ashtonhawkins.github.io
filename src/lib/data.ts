import readingData from "../data/reading.json";
import listeningData from "../data/listening.json";
import travelData from "../data/travel.json";

type ReadingItem = (typeof readingData)[number];
type ListeningItem = (typeof listeningData)[number];
type TravelItem = (typeof travelData)[number];

type ReadingSource = () => Promise<ReadingItem[]>;
type ListeningSource = () => Promise<ListeningItem[]>;
type TravelSource = () => Promise<TravelItem[]>;

type DataSourceConfig = {
  reading?: ReadingSource;
  listening?: ListeningSource;
  travel?: TravelSource;
};

let readingSource: ReadingSource = async () => readingData;
let listeningSource: ListeningSource = async () => listeningData;
let travelSource: TravelSource = async () => travelData;

export const getReading = () => readingSource();
export const getListening = () => listeningSource();
export const getTravel = () => travelSource();

export const swapDataSources = ({ reading, listening, travel }: DataSourceConfig) => {
  if (reading) readingSource = reading;
  if (listening) listeningSource = listening;
  if (travel) travelSource = travel;
};

export type { ReadingItem, ListeningItem, TravelItem };
