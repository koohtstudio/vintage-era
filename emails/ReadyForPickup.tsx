import { Text } from "@react-email/components";
import { Layout, button, h1, p } from "./Layout";

export default function ReadyForPickup(props: { firstName: string; number: string; storeName: string; address: string; statusUrl: string }) {
  return (
    <Layout preview={`Order ${props.number} is ready`}>
      <Text style={h1}>Ready for pickup.</Text>
      <Text style={p}>
        Hi {props.firstName || "there"}, order <b>{props.number}</b> is bagged and waiting at <b>{props.storeName}</b>.
      </Text>
      <Text style={p}>{props.address}</Text>
      <Text style={p}>Bring this email or your order number. It's free, and we'll hold it for you.</Text>
      <a href={props.statusUrl} style={button}>
        View order
      </a>
    </Layout>
  );
}
