import { Text } from "@react-email/components";
import { Layout, button, h1, p } from "./Layout";

export default function Shipped(props: { firstName: string; number: string; carrier: string; tracking: string; statusUrl: string }) {
  return (
    <Layout preview={`Order ${props.number} has shipped`}>
      <Text style={h1}>On its way.</Text>
      <Text style={p}>
        Hi {props.firstName || "there"}, order <b>{props.number}</b> shipped with {props.carrier}.
      </Text>
      <Text style={p}>
        Tracking number: <b>{props.tracking}</b>
      </Text>
      <a href={props.statusUrl} style={button}>
        View order
      </a>
    </Layout>
  );
}
