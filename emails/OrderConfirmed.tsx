import { Text } from "@react-email/components";
import { Layout, button, h1, p, rule } from "./Layout";

export interface OrderEmailProps {
  firstName: string;
  number: string;
  items: { title: string; price: string }[];
  total: string;
  fulfillment: "pickup" | "ship";
  storeName?: string | null;
  statusUrl: string;
}

export default function OrderConfirmed(props: OrderEmailProps) {
  return (
    <Layout preview={`Order ${props.number} confirmed`}>
      <Text style={h1}>It's yours, {props.firstName || "friend"}.</Text>
      <Text style={p}>
        Order <b>{props.number}</b> is confirmed.{" "}
        {props.fulfillment === "pickup"
          ? `We'll email you when it's bagged and ready at ${props.storeName ?? "the store"}.`
          : "We'll email tracking as soon as it ships."}
      </Text>
      {rule}
      {props.items.map((i) => (
        <Text key={i.title} style={{ ...p, margin: "0 0 6px" }}>
          {i.title} · {i.price}
        </Text>
      ))}
      {rule}
      <Text style={{ ...p, fontWeight: 700 }}>Total {props.total}</Text>
      <a href={props.statusUrl} style={button}>
        Follow your order
      </a>
    </Layout>
  );
}
