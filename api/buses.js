export default async function handler(req, res) {

  const stop = req.query.stop;

  const response = await fetch(
    `https://api.carrismetropolitana.pt/stops/${stop}/arrivals`
  );

  const data = await response.json();

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json(data);
}
