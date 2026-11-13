import { Text } from "@react-email/components";
import { Layout, button, h1, p } from "./Layout";

export default function DropAlert(props: { dropName: string; pieceTitles: string[]; shopUrl: string; unsubscribeUrl: string }) {
  return (
    <Layout preview={`${props.dropName} is live`} unsubscribeUrl={props.unsubscribeUrl}>
      <Text style={h1}>{props.dropName} just dropped.</Text>
      <Text style={p}>One of one goes fast. Here's some of what just hit the site:</Text>
      {props.pieceTitles.slice(0, 6).map((t) => (
        <Text key={t} style={{ ...p, margin: "0 0 4px" }}>
          • {t}
        </Text>
      ))}
      <Text style={{ ...p, marginTop: 12 }} />
      <a href={props.shopUrl} style={button}>
        Shop the drop
      </a>
    </Layout>
  );
}
