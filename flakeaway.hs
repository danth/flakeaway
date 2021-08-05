{-# LANGUAGE OverloadedStrings #-}
import Data.List (groupBy, find)
import Data.Maybe (mapMaybe)
import qualified Data.Text as T
import System.Process (readProcess, callProcess)

type Line = (Int, T.Text)

data Tree =
  Tree T.Text [Tree]
  deriving (Show)

removeEscapes :: T.Text -> T.Text
removeEscapes text =
  let escapes = ["\ESC[0m", "\ESC[1m", "\ESC[32;1m", "\ESC[33;1m"]
   in foldl (\text escape -> T.replace escape "" text) text escapes

blankBranches :: T.Text -> T.Text
blankBranches line =
  let branches :: [T.Text]
      branches = map T.singleton "│├─└"
      blankChar :: T.Text -> T.Text -> T.Text
      blankChar line char = T.replace char " " line
   in foldl blankChar line branches

removeBranches :: T.Text -> T.Text
removeBranches = T.stripStart . blankBranches

removeDescription :: T.Text -> T.Text
removeDescription = fst . T.breakOn (T.singleton ':')

attributeName :: T.Text -> T.Text
attributeName = removeDescription . removeBranches

indentation :: T.Text -> Int
indentation = (flip div 4) . T.length . T.takeWhile ((==) ' ') . blankBranches

parseLine :: T.Text -> Line
parseLine line = (indentation line, attributeName line)

groupLevel :: [Line] -> [[Line]]
groupLevel = groupBy (\(levelA, _) (levelB, _) -> levelA < levelB)

buildTree :: [Line] -> Tree
buildTree (self:[]) = Tree (snd self) []
buildTree (self:children) =
  let groups = groupLevel children
      children' = map buildTree groups
   in Tree (snd self) children'

parse :: T.Text -> Tree
parse = buildTree . map parseLine . T.lines . removeEscapes

getChild :: T.Text -> Tree -> Maybe Tree
getChild name (Tree _ children) = find (\(Tree n _) -> n == name) children

getFragments :: Tree -> [T.Text]
getFragments (Tree name []) = [name]
getFragments (Tree name children) =
  let childFragments = map (T.append name . T.cons '.') . getFragments
   in concatMap childFragments children

toplevelFragment :: T.Text -> T.Text
toplevelFragment path = T.append path ".config.system.build.toplevel"

getBuildableFragments' :: Tree -> [T.Text]
getBuildableFragments' (Tree name children) =
  map (T.append name . T.cons '.') $
  if name == "nixosConfigurations"
     then map toplevelFragment $ concatMap getFragments children
     else concatMap getFragments children

getBuildableFragments :: Tree -> [T.Text]
getBuildableFragments tree =
  let outputs = ["checks", "packages", "nixosConfigurations"]
      children = mapMaybe (\name -> getChild name tree) outputs
   in concatMap getBuildableFragments' children

putBullets :: [T.Text] -> IO ()
putBullets = mapM_ $ putStrLn . T.unpack . T.append "• "

buildFragment :: T.Text -> IO ()
buildFragment fragment =
  let fragment' :: String
      fragment' = ".#" ++ (T.unpack fragment)
   in do
     putStrLn $ "\nBuilding " ++ (T.unpack fragment) ++ "..."
     callProcess "nix" ["-L", "build", fragment', "--no-link"]

main :: IO ()
main = do
  putStrLn "Evaluating flake outputs..."
  shownFlake <- readProcess "nix" ["flake", "show"] ""

  putStrLn "Parsing flake outputs..."
  let tree = parse $ T.pack shownFlake
      buildableFragments = getBuildableFragments tree

  putStrLn "\nThese fragments will be built:"
  putBullets buildableFragments

  mapM_ buildFragment buildableFragments

  putStrLn "\n Building finished."
