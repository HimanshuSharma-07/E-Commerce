import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";


const Home = () => {

  const addToCartHandler = () => {

  }
  return (
    <div className="home">
      <section></section>

      <h1>
        Latest Products
        <Link to={"search"} className="findmore">
          More
        </Link>
      </h1>

      <main>
        <ProductCard
          productId="one"
          photo="https://m.media-amazon.com/images/I/615tKndaduL._SX679_.jpg"
          name="Mackbook"
          price={999999}
          stock={10}
          handler={addToCartHandler}
        />
      </main>
    </div>
  );
};

export default Home;
