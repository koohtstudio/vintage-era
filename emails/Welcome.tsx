import { Text } from "@react-email/components";
import { Layout, button, h1, p } from "./Layout";

export default function Welcome(props: { shopUrl: string; unsubscribeUrl: string }) {
  return (
    <Layout preview="You're on the drop list" unsubscribeUrl={props.unsubscribeUrl}>
      <Text style={h1}>You're on the list.</Text>
      <Text style={p}>We'll email you when new jerseys, jackets and grails hit the site. One of one goes fast.</Text>
      <a href={props.shopUrl} style={button}>
        See what's live
      </a>
    </Layout>
  );
}
