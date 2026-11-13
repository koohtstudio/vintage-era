import { Text } from "@react-email/components";
import { Layout, h1, p } from "./Layout";

export default function DoublePayApology(props: { firstName: string; number: string; pieceTitles: string[] }) {
  return (
    <Layout preview="We're sorry, that piece just sold">
      <Text style={h1}>So sorry, someone beat you to it.</Text>
      <Text style={p}>
        Hi {props.firstName || "there"}, every piece at Era Vintage is one of one, and {props.pieceTitles.join(", ")} sold to
        another shopper a moment before your payment came through.
      </Text>
      <Text style={p}>
        We've refunded order <b>{props.number}</b> in full. It can take a few business days to show on your statement. Nothing was
        shipped or bagged.
      </Text>
      <Text style={p}>Thank you for your patience. New pieces land every week, and drop alerts get you there first.</Text>
    </Layout>
  );
}
